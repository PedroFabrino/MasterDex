export type Locale = 'pt' | 'en'

export interface TranslationDictionary {
  common: {
    appName: string
    loading: string
    close: string
    save: string
    cancel: string
    error: string
    success: string
    cards: string
    emptySlot: string
    collectedSprite: string
    tcgCard: string
    holoRare: string
    pokemon: string
  }
  header: {
    binderSubtitle: string
    investorSubtitle: string
    pokeBinder: string
    tcgInvestor: string
    backup: string
    backupTooltip: string
    toggleBinderNav: string
    language: string
    portuguese: string
    english: string
    switchToLang: string
    speciesProgressTooltip: string
    tcgCardsCount: string
    tcgCardsTooltip: string
  }
  theme: {
    toggleTheme: string
    light: string
    dark: string
    system: string
  }
  cardSlot: {
    slotAriaLabel: string
    tcgFallbackBadge: string
  }

  sidebar: {
    binderIndex: string
    jumpPrompt: string
    regions: string
    regionPages: string
    pageTooltip: string
  }
  binderPage: {
    pageHeader: string
    collectedProgress: string
    previous: string
    next: string
    pageOption: string
    ofTotal: string
  }
  cardSelector: {
    removeFromCollection: string
    searchPlaceholder: string
    selectCardArtwork: string
    cardsFound: string
    defaultSprite: string
    defaultSpriteAnchorAria: string
    holoBadge: string
    noCardsFound: string
    searchHint: string
    loadMore: string
    loadingMore: string
    rarityFilter: string
    rarityBypassedHint: string
    printLanguageLabel: string
    otherLanguages: string
    langAll: string
    langPt: string
    langEn: string
    langJa: string
    langKo: string
    langZhTw: string
    langZhCn: string
    langEs: string
    langFr: string
    langDe: string
    langIt: string
  }
  backupModal: {
    title: string
    description: string
    tabFile: string
    tabSheets: string
    tabDev: string
    statusSeedSuccess: string
    statusNoCollection: string
    statusSeedError: string
    // File tab
    exportTitle: string
    exportDesc: string
    exportJson: string
    exportCsv: string
    exportSuccess: string

    importTitle: string
    importDesc: string
    importFileButton: string
    fileImportSuccess: string
    fileImportError: string
    // Sheets tab
    sheetUrlLabel: string
    sheetTokenLabel: string
    ingestGenButton: string
    pasteRowsLabel: string
    pasteRowsPlaceholder: string
    pasteRowsButton: string
    noSheetInputError: string
    noPastedRowsError: string
    sheetsSuccess: string
    pastedRowsSuccess: string
    // Dev tab
    devTitle: string
    devBadge: string
    devDesc: string
    loadPedroSeedButton: string
  }
  auth: {
    profileTitle: string
    signInTitle: string
    syncedDesc: string
    connectDesc: string
    activeBadge: string
    syncActiveTitle: string
    syncActiveDesc: string
    signOutButton: string
    guestSignInPrompt: string
    signInGoogle: string
    connecting: string
    signInButtonShort: string
  }
  investor: {
    leaderboardTitle: string
    leaderboardDesc: string
    setsCataloged: string
    refreshButton: string
    searchPlaceholder: string
    targetRarityLabel: string
    categoryLabel: string
    categoryBooster: string
    categoryPromo: string
    categoryAll: string
    sortByLabel: string
    // Rarities
    rarityAny: string
    rarityHolo: string
    rarityUltra: string
    rarityIllustration: string
    raritySecret: string
    // Sort options
    sortGapYield: string
    sortScore: string
    sortChase: string
    sortPool: string
    // States
    loadingYields: string
    noExpansionsFound: string
    adjustFilterHint: string
    // Expansion Card
    baseCountLabel: string
    secretCountLabel: string
    scoreLabel: string
    gapsCount: string
    missingInBinder: string
    topChaseLabel: string
    secretPoolLabel: string
    noData: string
    secretCardsCount: string
    viewSecretsButton: string
    analyzeMarketButton: string
    analyzeMarketTooltip: string
    hideSetTooltip: string
    unhideSetTooltip: string
    hiddenBadge: string
    hiddenTrayTitle: string
    hiddenTrayDesc: string
    hiddenCount: string
    toggleHiddenTrayShow: string
    toggleHiddenTrayHide: string
    unhideAllButton: string
    // Scrape Dialog
    analyzeMarketTitle: string
    scrapeModalDesc: string
    scrapeUrlLabel: string
    scrapeUrlPlaceholder: string
    extractingPrices: string
    startAnalysis: string
    scrapeSuccess: string
    scrapeFailed: string
    // Detail Modal
    detailBaseSecretHeader: string
    secretCardsSectionTitle: string
    loadingCards: string
    noCardsWithMarketPrice: string
    analyzeNowButton: string
    noImage: string
    marketLabel: string
  }
  binderSearch: {
    placeholder: string
    noResults: string
    pageIndicator: string
    shortcutBadge: string
    clearAria: string
    collectedStatus: string
    cardAssignedStatus: string
  }
  settings: {
    title: string
    description: string
    byokTitle: string
    byokDescription: string
    apiKeyLabel: string
    apiKeyPlaceholder: string
    showKey: string
    hideKey: string
    testConnection: string
    testingConnection: string
    testSuccess: string
    testFailed: string
    keyConfigured: string
    noKeyConfigured: string
    clearKey: string
    saveSettings: string
    savingSettings: string
    settingsSaved: string
    favoredLanguagesTitle: string
    favoredLanguagesDesc: string
    moveUp: string
    moveDown: string
    langPt: string
    langEn: string
    langJa: string
    menuButton: string
  }
}

