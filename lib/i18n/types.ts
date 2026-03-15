export type Locale = "ko" | "en" | "ja" | "zh" | "vi" | "zh-TW";

export type TranslationDict = {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    add: string;
    close: string;
    search: string;
    loading: string;
    confirm: string;
    back: string;
    next: string;
    submit: string;
    reset: string;
    export: string;
    import: string;
    all: string;
    none: string;
    yes: string;
    no: string;
    required: string;
    optional: string;
    noData: string;
    actions: string;
    status: string;
    name: string;
    description: string;
    date: string;
    type: string;
    total: string;
    detail: string;
    list: string;
    new: string;
    filter: string;
    login: string;
    logout: string;
    excelExport: string;
    success: string;
    failure: string;
    error: string;
    warning: string;
  };

  // Navigation / Sidebar
  nav: {
    dashboard: string;
    hardware: string;
    licenses: string;
    cloud: string;
    domainSsl: string;
    contracts: string;
    employees: string;
    orgChart: string;
    reports: string;
    changeHistory: string;
    settings: string;
    profile: string;
    groupSettings: string;
    notificationSettings: string;
    dataImport: string;
    adminGuide: string;
  };

  // Top header
  header: {
    admin: string;
    userManagement: string;
    archives: string;
    exchangeRate: string;
    assetCategory: string;
    excelExportAll: string;
    administrator: string;
    user: string;
    globalSearch: string;
    searchPlaceholder: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    totalAssets: string;
    totalLicenses: string;
    expiringAssets: string;
    monthlyExpenses: string;
    recentActivities: string;
    assetsByType: string;
    licenseUsage: string;
    items: string;
    seats: string;
    assigned: string;
    available: string;
    expired: string;
    active: string;
  };

  // License
  license: {
    title: string;
    newLicense: string;
    editLicense: string;
    licenseName: string;
    licenseType: string;
    keyBased: string;
    volume: string;
    noKey: string;
    quantity: string;
    price: string;
    purchaseDate: string;
    expiryDate: string;
    adminName: string;
    noticePeriod: string;
    days30: string;
    days90: string;
    custom: string;
    noNotice: string;
    customDays: string;
    key: string;
    seat: string;
    seatAssignment: string;
    usageRate: string;
    parentLicense: string;
    costInfo: string;
    paymentCycle: string;
    monthly: string;
    yearly: string;
    unitPrice: string;
    currency: string;
    exchangeRate: string;
    vatIncluded: string;
    totalAmount: string;
    group: string;
    groupSettings: string;
    createGroup: string;
    groupName: string;
    defaultGroup: string;
    licenseCount: string;
    assignedTo: string;
    unassigned: string;
  };

  // Employee
  employee: {
    title: string;
    newEmployee: string;
    employeeName: string;
    department: string;
    jobTitle: string;
    email: string;
    phone: string;
    status: string;
    active: string;
    inactive: string;
    onLeave: string;
    assignedAssets: string;
    assignedLicenses: string;
  };

  // Assets (common for hardware/cloud/domain/contract)
  asset: {
    assetName: string;
    vendor: string;
    cost: string;
    purchaseDate: string;
    expiryDate: string;
    assignee: string;
    statusActive: string;
    statusInUse: string;
    statusInStock: string;
    statusMaintenance: string;
    statusDisposed: string;
    statusExpired: string;
    register: string;
    editAsset: string;
  };

  // Hardware
  hw: {
    title: string;
    newHardware: string;
    deviceType: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    assetTag: string;
    hostname: string;
    ipAddress: string;
    macAddress: string;
    os: string;
    osVersion: string;
    location: string;
    usefulLife: string;
    depreciation: string;
    laptop: string;
    desktop: string;
    server: string;
    network: string;
    mobile: string;
    monitor: string;
    peripheral: string;
    securityDevice: string;
    storage: string;
    backup: string;
    rack: string;
    component: string;
    facility: string;
    other: string;
    // security device subtypes
    firewall: string;
    ids: string;
    ips: string;
    vpn: string;
    waf: string;
    antivirus: string;
    nac: string;
    dlp: string;
    // storage subtypes
    san: string;
    nas: string;
    storageDevice: string;
    // warranty/purchase
    warranty: string;
    warrantyExpiry: string;
    warrantyProvider: string;
    poNumber: string;
    invoiceNumber: string;
    condition: string;
    conditionA: string;
    conditionB: string;
    conditionC: string;
    conditionD: string;
    notes: string;
    // network/infra
    networkInfra: string;
    secondaryIp: string;
    subnetMask: string;
    gateway: string;
    vlanId: string;
    dnsHostname: string;
    firmwareVersion: string;
    portCount: string;
    resolution: string;
    connectionType: string;
    storageCap: string;
    rackSize: string;
    rackStandard: string;
    rackNonStandard: string;
    componentType: string;
  };

  // Cloud
  cloud: {
    title: string;
    newCloud: string;
    platform: string;
    accountId: string;
    region: string;
    serviceCategory: string;
    resourceType: string;
    resourceId: string;
    seatCount: string;
    contractPeriod: string;
    renewalDate: string;
    cancellationDeadline: string;
  };

  // Domain / SSL
  domain: {
    title: string;
    newDomain: string;
    registrar: string;
    daysLeft: string;
  };

  // Contract
  contract: {
    title: string;
    newContract: string;
    contractType: string;
    counterparty: string;
    autoRenewal: string;
    maintenance: string;
    sla: string;
    outsourcing: string;
  };

  // Org Chart
  org: {
    title: string;
    manage: string;
    visual: string;
    securityOrgChart: string;
    newCompany: string;
    companyName: string;
    addDepartment: string;
    addPosition: string;
    topPosition: string;
    assignPerson: string;
    unassignedPerson: string;
    members: string;
    orgs: string;
  };

  // Reports
  report: {
    title: string;
    monthlyReport: string;
    generate: string;
    download: string;
    sendEmail: string;
    period: string;
  };

  // History / Audit
  history: {
    title: string;
    action: string;
    actor: string;
    entity: string;
    timestamp: string;
    details: string;
    created: string;
    updated: string;
    deleted: string;
  };

  // CIA
  cia: {
    title: string;
    confidentiality: string;
    integrity: string;
    availability: string;
    grade: string;
    notEvaluated: string;
    gradeResult: string;
    evaluateAll: string;
    low: string;
    medium: string;
    high: string;
    grade1: string;
    grade2: string;
    grade3: string;
    points: string;
  };

  // Guide
  guide: {
    title: string;
    subtitle: string;
    progress: string;
    completed: string;
    quickLinks: string;
  };

  // Notifications
  notification: {
    title: string;
    testSend: string;
    emailChannel: string;
    slackChannel: string;
    sendHistory: string;
  };

  // Auth / Login
  auth: {
    loginTitle: string;
    username: string;
    password: string;
    loginButton: string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };

  // Toast messages
  toast: {
    saveSuccess: string;
    saveFail: string;
    deleteSuccess: string;
    deleteFail: string;
    createSuccess: string;
    createFail: string;
    updateSuccess: string;
    updateFail: string;
    loginFail: string;
    logoutSuccess: string;
    confirmDelete: string;
  };

  // Tour guide
  tour: {
    // UI controls
    nextBtn: string;
    prevBtn: string;
    doneBtn: string;
    guideBtn: string;
    guideBtnTooltip: string;
    // Dashboard tour
    dashboardWelcomeTitle: string;
    dashboardWelcomeDesc: string;
    sidebarTitle: string;
    sidebarDesc: string;
    globalSearchTitle: string;
    globalSearchDesc: string;
    userMenuTitle: string;
    userMenuDesc: string;
    dashboardSummaryTitle: string;
    dashboardSummaryDesc: string;
    dashboardCategoriesTitle: string;
    dashboardCategoriesDesc: string;
    // Licenses tour
    licensesTitle: string;
    licensesDesc: string;
    licenseTableTitle: string;
    licenseTableDesc: string;
    licenseNewTitle: string;
    licenseNewDesc: string;
    licenseAssignTitle: string;
    licenseAssignDesc: string;
    // Cloud tour
    cloudTitle: string;
    cloudDesc: string;
    cloudNewTitle: string;
    cloudNewDesc: string;
    cloudTableTitle: string;
    cloudTableDesc: string;
    // Hardware tour
    hwTitle: string;
    hwDesc: string;
    hwSearchTitle: string;
    hwSearchDesc: string;
    hwStatusFilterTitle: string;
    hwStatusFilterDesc: string;
    hwNewTitle: string;
    hwNewDesc: string;
    hwTableTitle: string;
    hwTableDesc: string;
    hwActionsTitle: string;
    hwActionsDesc: string;
    // Domains tour
    domainsTitle: string;
    domainsDesc: string;
    domainNewTitle: string;
    domainNewDesc: string;
    domainTableTitle: string;
    domainTableDesc: string;
    // Employees tour
    empTitle: string;
    empDesc: string;
    empSearchTitle: string;
    empSearchDesc: string;
    empFilterTitle: string;
    empFilterDesc: string;
    empNewTitle: string;
    empNewDesc: string;
    empTableTitle: string;
    empTableDesc: string;
    // History tour
    historyTitle: string;
    historyDesc: string;
    historyFilterTitle: string;
    historyFilterDesc: string;
    historyTableTitle: string;
    historyTableDesc: string;
    // Contracts tour
    contractsTitle: string;
    contractsDesc: string;
    contractSearchTitle: string;
    contractSearchDesc: string;
    contractFilterTitle: string;
    contractFilterDesc: string;
    contractNewTitle: string;
    contractNewDesc: string;
    contractTableTitle: string;
    contractTableDesc: string;
    // Org chart tour
    orgTitle: string;
    orgDesc: string;
    orgTabsTitle: string;
    orgTabsDesc: string;
    orgNewCompanyTitle: string;
    orgNewCompanyDesc: string;
    orgTreeTitle: string;
    orgTreeDesc: string;
    // Reports tour
    reportsTitle: string;
    reportsDesc: string;
    reportPeriodTitle: string;
    reportPeriodDesc: string;
    reportExportTitle: string;
    reportExportDesc: string;
    reportEmailTitle: string;
    reportEmailDesc: string;
    // Settings - Groups tour
    groupsTitle: string;
    groupsDesc: string;
    groupNewTitle: string;
    groupNewDesc: string;
    groupTableTitle: string;
    groupTableDesc: string;
    // Settings - Import tour
    importTitle: string;
    importDesc: string;
    importFormTitle: string;
    importFormDesc: string;
    // Settings - Notifications tour
    notifTitle: string;
    notifDesc: string;
    notifTestTitle: string;
    notifTestDesc: string;
    notifLogTitle: string;
    notifLogDesc: string;
    // Settings - Profile tour
    profileTitle: string;
    profileDesc: string;
    profileInfoTitle: string;
    profileInfoDesc: string;
    profilePasswordTitle: string;
    profilePasswordDesc: string;
    // Admin - Users tour
    adminUsersTitle: string;
    adminUsersDesc: string;
    adminUsersSearchTitle: string;
    adminUsersSearchDesc: string;
    adminUsersTableTitle: string;
    adminUsersTableDesc: string;
    // Admin - Exchange Rates tour
    exchangeRatesTitle: string;
    exchangeRatesDesc: string;
    exchangeRatesSyncTitle: string;
    exchangeRatesSyncDesc: string;
    exchangeRatesTableTitle: string;
    exchangeRatesTableDesc: string;
    // Guide page tour
    guideTourTitle: string;
    guideTourDesc: string;
    guideProgressTitle: string;
    guideProgressDesc: string;
    guideSectionsTitle: string;
    guideSectionsDesc: string;
    guideQuickLinksTitle: string;
    guideQuickLinksDesc: string;
  };
};
