import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import {
  BulkImportSummary,
  ImportRowResult,
  REQUIRED_FOR_PUBLISH,
  VocabularyDataService,
  VocabularyWord,
  WordFormModel,
  WordStatus,
  WORD_TYPES
} from '../../../services/vocabulary-data.service';
import { levelBadgeStyle } from '../../../shared/level-badge';

const EMPTY_FORM: WordFormModel = {
  word: '',
  phonetic: '',
  meaning: '',
  level: 'B1',
  category: 'Akademik',
  wordType: '',
  example: '',
  audioUrl: ''
};

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const DRAFT_AUTOSAVE_DELAY_MS = 400;
const UNDO_WINDOW_MS = 10000;

type MissingFieldFilter = '' | 'phonetic' | 'example' | 'audioUrl';

const IMPORT_TARGET_FIELDS: { value: keyof WordFormModel | ''; label: string }[] = [
  { value: 'word', label: 'Kelime' },
  { value: 'meaning', label: 'Türkçe anlam' },
  { value: 'phonetic', label: 'IPA' },
  { value: 'level', label: 'Seviye' },
  { value: 'category', label: 'Kategori' },
  { value: 'wordType', label: 'Tür' },
  { value: 'example', label: 'Örnek cümle' },
  { value: 'audioUrl', label: 'Ses URL' },
  { value: '', label: 'Yok say' }
];

/** Turkish label for each field, reusing the import wizard's field names so the two stay in sync. */
const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  IMPORT_TARGET_FIELDS.filter((f) => f.value).map((f) => [f.value, f.label])
);

/** Header synonyms used to auto-guess the CSV column mapping in step 2 of the import wizard. */
const HEADER_SYNONYMS: Record<keyof WordFormModel, string[]> = {
  word: ['word', 'kelime', 'en', 'english', 'ingilizce'],
  meaning: ['meaning', 'tr', 'anlam', 'turkish', 'ceviri', 'çeviri', 'turkce'],
  phonetic: ['phon', 'phonetic', 'ipa', 'telaffuz', 'okunus', 'okunuş'],
  level: ['level', 'seviye', 'cefr'],
  category: ['category', 'kategori', 'konu'],
  wordType: ['type', 'tur', 'tür', 'pos', 'wordtype', 'sozcukturu', 'sözcüktürü'],
  example: ['example', 'ornek', 'örnek', 'sentence', 'cumle', 'cümle'],
  audioUrl: ['audio', 'ses', 'mp3', 'sound', 'audiourl']
};

@Component({
  selector: 'app-admin-vocabulary',
  templateUrl: './admin-vocabulary.component.html',
  styleUrls: ['./admin-vocabulary.component.css']
})
export class AdminVocabularyComponent implements OnInit, OnDestroy {
  words: VocabularyWord[] = [];
  filteredWords: VocabularyWord[] = [];
  isLoading = true;
  loadError = '';

  searchTerm = '';
  selectedLevel = '';
  selectedCategory = '';
  selectedWordType = '';
  selectedStatus: '' | WordStatus = '';
  missingFieldFilter: MissingFieldFilter = '';

  currentPage = 1;
  pageSize = 50;

  selectedIds = new Set<number>();
  duplicateIds = new Set<number>();

  isModalOpen = false;
  editingWord: VocabularyWord | null = null;
  formModel: WordFormModel = { ...EMPTY_FORM };
  isSaving = false;
  errorMessage = '';
  draftRestoredNotice = false;
  private draftAutosaveTimeout?: ReturnType<typeof setTimeout>;
  private formDirty = false;

  readonly cefrLevels = CEFR_LEVELS;
  readonly wordTypes = WORD_TYPES;
  levelOptions: string[] = [];
  categoryOptions: string[] = [];

  undoSnackbar: { message: string; run: () => void } | null = null;
  private undoTimeout?: ReturnType<typeof setTimeout>;

  isImportOpen = false;
  importStep: 1 | 2 | 3 = 1;
  importFileName = '';
  importHeaders: string[] = [];
  importRows: string[][] = [];
  importColumnMap: Record<string, keyof WordFormModel | ''> = {};
  readonly importTargetFields = IMPORT_TARGET_FIELDS;
  importPreview: ImportRowResult[] = [];
  importOverwriteDuplicates = false;
  isImporting = false;
  importSummary: BulkImportSummary | null = null;

  openRowMenuId: number | null = null;
  editingCell: { id: number; field: 'meaning' } | null = null;
  inlineEditValue = '';

  constructor(private vocabService: VocabularyDataService) {}

  async ngOnInit() {
    await this.reload();
  }

  ngOnDestroy() {
    if (this.draftAutosaveTimeout) clearTimeout(this.draftAutosaveTimeout);
    if (this.undoTimeout) clearTimeout(this.undoTimeout);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const isEditableTarget = !!target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

    if (event.key === 'Escape') {
      if (this.isModalOpen && !this.isSaving) {
        this.closeModal();
      } else if (this.isImportOpen) {
        this.closeImport();
      } else if (this.openRowMenuId !== null) {
        this.openRowMenuId = null;
      }
      return;
    }

    if (event.key === '/' && !isEditableTarget && !this.isModalOpen && !this.isImportOpen) {
      event.preventDefault();
      document.getElementById('admin-word-search')?.focus();
      return;
    }

    const saveCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
    if (saveCombo && this.isModalOpen) {
      event.preventDefault();
      void this.saveWord();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.openRowMenuId !== null && !(event.target as HTMLElement).closest('.row-menu-anchor')) {
      this.openRowMenuId = null;
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent) {
    if (this.isModalOpen && this.formDirty) {
      event.preventDefault();
      event.returnValue = true;
    }
  }

  private async reload() {
    this.isLoading = true;
    this.loadError = '';

    try {
      this.words = await this.vocabService.getWordsForAdmin();
      this.refreshOptions();
      this.applyFilters();
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : 'Kelimeler yüklenemedi.';
    } finally {
      this.isLoading = false;
    }
  }

  private refreshOptions() {
    this.levelOptions = Array.from(new Set(this.words.map((w) => w.level).filter(Boolean))).sort();
    this.categoryOptions = Array.from(new Set(this.words.map((w) => w.category).filter(Boolean))).sort();
    this.computeDuplicates();
  }

  /** Flags words that share the same (word, tür) key as another row — the same key CSV import dedup uses. */
  private computeDuplicates() {
    const idsByKey = new Map<string, number[]>();
    for (const word of this.words) {
      const key = dedupKey(word.word, word.wordType);
      const ids = idsByKey.get(key) ?? [];
      ids.push(word.id);
      idsByKey.set(key, ids);
    }

    this.duplicateIds = new Set(Array.from(idsByKey.values()).filter((ids) => ids.length > 1).flat());
  }

  isDuplicate(word: VocabularyWord): boolean {
    return this.duplicateIds.has(word.id);
  }

  // ---------- stats ----------

  get totalCount() {
    return this.words.length;
  }

  get publishedCount() {
    return this.words.filter((w) => w.status === 'published').length;
  }

  get missingFieldCount() {
    return this.words.filter((w) => this.missingFields(w).length > 0).length;
  }

  missingFields(word: VocabularyWord): string[] {
    return REQUIRED_FOR_PUBLISH.filter((field) => !String(word[field] ?? '').trim());
  }

  fieldLabel(field: string): string {
    return FIELD_LABELS[field] ?? field;
  }

  canPublish(word: VocabularyWord): boolean {
    return this.missingFields(word).length === 0;
  }

  statusLabel(status: WordStatus): string {
    return status === 'published' ? 'Yayında' : status === 'archived' ? 'Arşivde' : 'Taslak';
  }

  readonly levelBadgeStyle = levelBadgeStyle;

  statusIcon(status: WordStatus): string {
    return status === 'published' ? '✓' : status === 'archived' ? '⊘' : '◑';
  }

  // ---------- filtering & pagination ----------

  applyFilters() {
    this.filteredWords = this.words.filter((word) => {
      const term = this.searchTerm.trim().toLowerCase();
      const matchesSearch = !term || word.word.toLowerCase().includes(term) || word.meaning.toLowerCase().includes(term) || String(word.id).includes(term);
      const matchesLevel = !this.selectedLevel || word.level === this.selectedLevel;
      const matchesCategory = !this.selectedCategory || word.category === this.selectedCategory;
      const matchesWordType = !this.selectedWordType || word.wordType === this.selectedWordType;
      const matchesStatus = !this.selectedStatus || word.status === this.selectedStatus;
      const matchesMissing = !this.missingFieldFilter || !String((word as any)[this.missingFieldFilter] ?? '').trim();
      return matchesSearch && matchesLevel && matchesCategory && matchesWordType && matchesStatus && matchesMissing;
    });
    this.currentPage = 1;
    this.selectedIds.clear();
  }

  setMissingFieldFilter(filter: MissingFieldFilter) {
    this.missingFieldFilter = this.missingFieldFilter === filter ? '' : filter;
    this.applyFilters();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedLevel = '';
    this.selectedCategory = '';
    this.selectedWordType = '';
    this.selectedStatus = '';
    this.missingFieldFilter = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedLevel || this.selectedCategory || this.selectedWordType || this.selectedStatus || this.missingFieldFilter);
  }

  get paginatedWords(): VocabularyWord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredWords.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredWords.length / this.pageSize) || 1;
  }

  get firstItemIndex(): number {
    return this.filteredWords.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get lastItemIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredWords.length);
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  setPage(page: number) {
    this.currentPage = page;
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // ---------- selection & bulk actions ----------

  isSelected(word: VocabularyWord): boolean {
    return this.selectedIds.has(word.id);
  }

  toggleSelect(word: VocabularyWord) {
    if (this.selectedIds.has(word.id)) {
      this.selectedIds.delete(word.id);
    } else {
      this.selectedIds.add(word.id);
    }
  }

  get isPageFullySelected(): boolean {
    return this.paginatedWords.length > 0 && this.paginatedWords.every((w) => this.selectedIds.has(w.id));
  }

  toggleSelectPage() {
    if (this.isPageFullySelected) {
      this.paginatedWords.forEach((w) => this.selectedIds.delete(w.id));
    } else {
      this.paginatedWords.forEach((w) => this.selectedIds.add(w.id));
    }
  }

  selectAllFiltered() {
    this.filteredWords.forEach((w) => this.selectedIds.add(w.id));
  }

  clearSelection() {
    this.selectedIds.clear();
  }

  private get selectedWords(): VocabularyWord[] {
    return this.words.filter((w) => this.selectedIds.has(w.id));
  }

  async bulkPublish() {
    const targets = this.selectedWords;
    const publishable = targets.filter((w) => this.canPublish(w));
    if (publishable.length === 0) {
      this.errorMessage = 'Seçilenlerin hiçbiri yayına hazır değil (eksik zorunlu alan var).';
      return;
    }

    const updated = await this.vocabService.bulkSetStatus(publishable, 'published');
    this.applyWordUpdates(updated);
    this.clearSelection();

    if (publishable.length < targets.length) {
      this.errorMessage = `${targets.length - publishable.length} kelime eksik alan yüzünden yayınlanamadı.`;
    }
  }

  async bulkArchive() {
    const targets = this.selectedWords;
    if (targets.length === 0) return;

    const updated = await this.vocabService.bulkSetStatus(targets, 'archived');
    this.applyWordUpdates(updated);
    this.clearSelection();
    this.showUndo(`${targets.length} kelime arşivlendi. Öğrenci listelerinden kaldırıldı.`, async () => {
      const restored = await this.vocabService.bulkSetStatus(updated, 'published');
      this.applyWordUpdates(restored);
    });
  }

  async onBulkLevelChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const level = select.value;
    select.value = '';
    await this.bulkChangeLevel(level);
  }

  async bulkChangeLevel(level: string) {
    const targets = this.selectedWords;
    if (targets.length === 0 || !level) return;

    const updated = await this.vocabService.bulkSetLevel(targets, level);
    this.applyWordUpdates(updated);
    this.refreshOptions();
    this.clearSelection();
  }

  /** Requires the admin to type the exact count as a confirmation, since this bypasses the undo-able archive path. */
  async bulkDeletePermanently() {
    const targets = this.selectedWords;
    if (targets.length === 0) return;

    const typed = prompt(`Bu işlem geri alınamaz. Onaylamak için "${targets.length}" yazın.`);
    if (typed !== String(targets.length)) {
      return;
    }

    for (const word of targets) {
      await this.vocabService.deleteWord(word.id);
    }
    this.words = this.words.filter((w) => !this.selectedIds.has(w.id));
    this.applyFilters();
    this.clearSelection();
  }

  private applyWordUpdates(updated: VocabularyWord[]) {
    const byId = new Map(updated.map((w) => [w.id, w]));
    this.words = this.words.map((w) => byId.get(w.id) ?? w);
    this.applyFilters();
  }

  private showUndo(message: string, run: () => void | Promise<void>) {
    if (this.undoTimeout) clearTimeout(this.undoTimeout);
    this.undoSnackbar = { message, run: () => void run() };
    this.undoTimeout = setTimeout(() => (this.undoSnackbar = null), UNDO_WINDOW_MS);
  }

  runUndo() {
    if (!this.undoSnackbar) return;
    this.undoSnackbar.run();
    this.undoSnackbar = null;
    if (this.undoTimeout) clearTimeout(this.undoTimeout);
  }

  // ---------- single-row actions ----------

  async archiveWord(word: VocabularyWord) {
    const updated = await this.vocabService.archiveWord(word);
    this.applyWordUpdates([updated]);
    this.showUndo(`"${word.word}" arşivlendi.`, async () => {
      const restored = await this.vocabService.restoreWord(updated);
      this.applyWordUpdates([restored]);
    });
  }

  async publishWord(word: VocabularyWord) {
    try {
      const updated = await this.vocabService.publishWord(word);
      this.applyWordUpdates([updated]);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Yayınlanamadı.';
    }
  }

  async restoreWord(word: VocabularyWord) {
    const updated = await this.vocabService.restoreWord(word);
    this.applyWordUpdates([updated]);
  }

  duplicateWord(word: VocabularyWord) {
    this.editingWord = null;
    this.formModel = {
      word: word.word,
      phonetic: word.phonetic,
      meaning: word.meaning,
      level: word.level,
      category: word.category,
      wordType: word.wordType,
      example: word.example,
      audioUrl: ''
    };
    this.errorMessage = '';
    this.draftRestoredNotice = false;
    this.isModalOpen = true;
    this.openRowMenuId = null;
  }

  // ---------- inline quick edit ----------

  startInlineEdit(word: VocabularyWord) {
    this.editingCell = { id: word.id, field: 'meaning' };
    this.inlineEditValue = word.meaning;
  }

  async commitInlineEdit(word: VocabularyWord) {
    if (!this.editingCell) return;
    const value = this.inlineEditValue.trim();
    this.editingCell = null;

    if (!value || value === word.meaning) return;

    const updated = await this.vocabService.updateWord(word.id, { ...this.stripMeta(word), meaning: value });
    this.applyWordUpdates([updated]);
  }

  cancelInlineEdit() {
    this.editingCell = null;
  }

  private stripMeta(word: VocabularyWord): WordFormModel {
    const { id, learned, bookmarked, status, updatedAt, updatedByEmail, ...rest } = word;
    return rest;
  }

  // ---------- add/edit modal ----------

  openAddModal() {
    this.editingWord = null;
    this.errorMessage = '';
    this.formModel = { ...EMPTY_FORM };
    this.loadDraftIfNewer('new');
    this.isModalOpen = true;
    this.formDirty = false;
  }

  openEditModal(word: VocabularyWord) {
    this.editingWord = word;
    this.formModel = this.stripMeta(word);
    this.errorMessage = '';
    this.loadDraftIfNewer(String(word.id));
    this.isModalOpen = true;
    this.formDirty = false;
    this.openRowMenuId = null;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingCell = null;
  }

  onFormChange() {
    this.formDirty = true;
    this.draftRestoredNotice = false;
    if (this.draftAutosaveTimeout) clearTimeout(this.draftAutosaveTimeout);
    this.draftAutosaveTimeout = setTimeout(() => this.saveDraftToLocalStorage(), DRAFT_AUTOSAVE_DELAY_MS);
  }

  private draftKey(id: string) {
    return `admin-word-draft-${id}`;
  }

  private saveDraftToLocalStorage() {
    try {
      const key = this.draftKey(this.editingWord ? String(this.editingWord.id) : 'new');
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), formModel: this.formModel }));
    } catch {
      // Local storage can be unavailable (private browsing, quota); autosave is best-effort.
    }
  }

  private loadDraftIfNewer(id: string) {
    try {
      const raw = localStorage.getItem(this.draftKey(id));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt: number; formModel: WordFormModel };
      this.formModel = parsed.formModel;
      this.draftRestoredNotice = true;
    } catch {
      // Corrupt or missing draft: fall back to the value already set by the caller.
    }
  }

  private clearDraft() {
    try {
      localStorage.removeItem(this.draftKey(this.editingWord ? String(this.editingWord.id) : 'new'));
    } catch {
      // Nothing to clean up if storage isn't available.
    }
  }

  get publishBlockedFields(): string[] {
    return REQUIRED_FOR_PUBLISH.filter((field) => !String((this.formModel as any)[field] ?? '').trim());
  }

  get publishBlockedFieldLabels(): string {
    return this.publishBlockedFields.map((field) => this.fieldLabel(field)).join(', ');
  }

  async saveWord() {
    if (!this.formModel.word.trim() || !this.formModel.meaning.trim()) {
      this.errorMessage = 'Kelime ve anlam alanları zorunludur.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    try {
      await this.persistWord();
      this.clearDraft();
      this.refreshOptions();
      this.formDirty = false;
      this.isModalOpen = false;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Kelime kaydedilemedi.';
    } finally {
      this.isSaving = false;
    }
  }

  async publishFromModal() {
    if (!this.formModel.word.trim() || !this.formModel.meaning.trim()) {
      this.errorMessage = 'Kelime ve anlam alanları zorunludur.';
      return;
    }
    if (this.publishBlockedFields.length > 0) return;

    this.isSaving = true;
    this.errorMessage = '';

    try {
      const saved = await this.persistWord();
      const published = await this.vocabService.publishWord(saved);
      this.applyWordUpdates([published]);
      this.clearDraft();
      this.refreshOptions();
      this.formDirty = false;
      this.isModalOpen = false;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Yayınlanamadı.';
    } finally {
      this.isSaving = false;
    }
  }

  /** Persists the current formModel (create or update) and folds the result into `words`. Returns the saved word. */
  private async persistWord(): Promise<VocabularyWord> {
    if (this.editingWord) {
      const updated = await this.vocabService.updateWord(this.editingWord.id, this.formModel);
      this.applyWordUpdates([updated]);
      return updated;
    }

    const created = await this.vocabService.createWord(this.formModel);
    this.words = [...this.words, created];
    this.applyFilters();
    return created;
  }

  // ---------- CSV import wizard ----------

  openImport() {
    this.isImportOpen = true;
    this.importStep = 1;
    this.importFileName = '';
    this.importHeaders = [];
    this.importRows = [];
    this.importColumnMap = {};
    this.importPreview = [];
    this.importSummary = null;
    this.importOverwriteDuplicates = false;
  }

  closeImport() {
    this.isImportOpen = false;
  }

  async onImportFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importFileName = file.name;
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      this.errorMessage = 'Dosya boş görünüyor.';
      return;
    }

    this.importHeaders = parsed[0];
    this.importRows = parsed.slice(1).filter((row) => row.some((cell) => cell.trim() !== ''));
    this.importColumnMap = this.guessColumnMap(this.importHeaders);
    this.importStep = 2;
  }

  private guessColumnMap(headers: string[]): Record<string, keyof WordFormModel | ''> {
    const map: Record<string, keyof WordFormModel | ''> = {};
    const used = new Set<keyof WordFormModel>();

    headers.forEach((header) => {
      const normalized = header.trim().toLowerCase().replace(/[^a-zçğıöşü]/g, '');
      let matchedField: keyof WordFormModel | '' = '';

      for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS) as [keyof WordFormModel, string[]][]) {
        if (used.has(field)) continue;
        if (synonyms.some((syn) => normalized === syn || normalized.includes(syn))) {
          matchedField = field;
          break;
        }
      }

      if (matchedField) used.add(matchedField);
      map[header] = matchedField;
    });

    return map;
  }

  goToImportPreview() {
    this.importPreview = this.buildImportPreview();
    this.importStep = 3;
  }

  private buildImportPreview(): ImportRowResult[] {
    const existingKeys = new Map<string, number>();
    this.words.forEach((w) => existingKeys.set(dedupKey(w.word, w.wordType), w.id));
    const seenInBatch = new Set<string>();

    return this.importRows.map((row, index) => {
      const values: WordFormModel = { ...EMPTY_FORM };
      this.importHeaders.forEach((header, col) => {
        const field = this.importColumnMap[header];
        if (field) {
          (values as any)[field] = (row[col] ?? '').trim();
        }
      });

      if (!values.word || !values.meaning) {
        return { row: index + 1, values, outcome: 'error', errorReason: 'Kelime veya anlam eksik' } as ImportRowResult;
      }

      const key = dedupKey(values.word, values.wordType);
      const existingId = existingKeys.get(key);

      if (existingId) {
        return { row: index + 1, values, outcome: 'duplicate', existingId } as ImportRowResult;
      }

      if (seenInBatch.has(key)) {
        return { row: index + 1, values, outcome: 'duplicate' } as ImportRowResult;
      }

      seenInBatch.add(key);
      return { row: index + 1, values, outcome: 'new' } as ImportRowResult;
    });
  }

  get importNewCount() {
    return this.importPreview.filter((r) => r.outcome === 'new').length;
  }

  get importDuplicateCount() {
    return this.importPreview.filter((r) => r.outcome === 'duplicate').length;
  }

  get importErrorCount() {
    return this.importPreview.filter((r) => r.outcome === 'error').length;
  }

  async confirmImport() {
    this.isImporting = true;
    try {
      this.importSummary = await this.vocabService.bulkImport(this.importPreview, this.importOverwriteDuplicates);
      const overwrittenById = new Map(this.importSummary.overwritten.map((w) => [w.id, w]));
      this.words = [...this.words.map((w) => overwrittenById.get(w.id) ?? w), ...this.importSummary.created];
      this.refreshOptions();
      this.applyFilters();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'İçe aktarma başarısız oldu.';
    } finally {
      this.isImporting = false;
    }
  }

  downloadErrorReport() {
    const errors = this.importPreview.filter((r) => r.outcome === 'error');
    const rows = [['Satır', 'Kelime', 'Anlam', 'Hata'], ...errors.map((r) => [String(r.row), r.values.word, r.values.meaning, r.errorReason ?? ''])];
    downloadCsv(rows, 'ice-aktarma-hatalari.csv');
  }

  downloadTemplate() {
    const rows = [
      ['word', 'tr', 'phon', 'level', 'category', 'type', 'example'],
      ['example', 'örnek', '/ɪɡˈzæmpəl/', 'B1', 'Akademik', 'isim', 'This is an example sentence.']
    ];
    downloadCsv(rows, 'kelime-sablonu.csv');
  }

  // ---------- export ----------

  exportList() {
    if (this.filteredWords.length === 0) return;
    const rows = [
      ['Kelime', 'IPA', 'Anlam', 'Seviye', 'Kategori', 'Tür', 'Durum', 'Örnek'],
      ...this.filteredWords.map((w) => [w.word, w.phonetic, w.meaning, w.level, w.category, w.wordType, this.statusLabel(w.status), w.example])
    ];
    downloadCsv(rows, 'kelime-listesi-admin.csv');
  }

}

function dedupKey(word: string, wordType: string): string {
  return `${word.trim().toLowerCase()}::${(wordType || '').trim().toLowerCase()}`;
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded commas/quotes, and CRLF or LF line endings. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = '﻿' + rows.map((row) => row.map((cell) => `"${(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
