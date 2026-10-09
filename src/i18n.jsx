// English + Khmer text for the whole app, and the language switch.
import { createContext, useContext, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Globe } from "lucide-react";

const text = {
  en: {
    title: "Technician Location Map",
    panels: "Panels",
    deleteZoneDesc:
      "The zone is removed for all admins. This cannot be undone.",
    deleteTechDesc: "Their zones become unassigned. This cannot be undone.",
    techFormDesc: "Name, phone, color and photo shown on the map.",
    subtitle: "Service zones and technicians in Phnom Penh",
    demoMode:
      "Demo mode – data is saved only in this browser. Add Supabase keys to share with all admins.",
    signOut: "Sign out",
    // Map toolbar
    drawZone: "Draw zone",
    stopDrawing: "Cancel drawing",
    drawHint:
      "Click points around the area. Click the first point (or press Enter) to finish. Esc = cancel.",
    editHint:
      'Editing on: draw new zones and drag pins. To change a zone, click it, then "Edit" – drag corners, drag a middle dot to add one, right-click a corner to remove it.',
    pickHint: "Click anywhere on the map to check a customer location.",
    // Filter
    viewAll: "View All",
    // Marker popup
    phone: "Phone",
    zones: "Zones",
    noZones: "No zones yet",
    call: "Call",
    main: "Main",
    backup: "Backup",
    office: "Office",
    // Zone panel
    zone: "Zone",
    zoneName: "Zone name",
    mainTech: "Main technician",
    backupTech: "Backup technician",
    none: "— None —",
    save: "Save",
    saved: "Saved",
    delete: "Delete",
    close: "Close",
    cancel: "Cancel",
    confirmDeleteZone: "Delete this zone?",
    newZoneHint: "New zone drawn. Name it and pick a technician.",
    // Service area list
    serviceAreas: "Service Areas",
    totalArea: "Total area",
    noZonesYet: 'No zones yet. Click "Draw zone" on the map to add one.',
    unassigned: "Unassigned",
    // Customer check
    customerCheck: "Customer Check",
    searchAddress: "Address, or paste a Google Maps link…",
    shortLink:
      "Short links (maps.app.goo.gl) can't be read. Open the link in your browser, then copy the long address from the address bar and paste that.",
    pickOnMap: "Pick on map",
    picking: "Click the map…",
    clear: "Clear",
    location: "Location",
    insideZone: "Zone",
    handledBy: "Technician",
    noTechnician: "No technician assigned",
    outsidePhnomPenh: "Outside Phnom Penh",
    provinceNotServed: "We only serve Phnom Penh for now. Delivery and service in the provinces are not available.",
    distance: "Driving distance",
    driveTime: "Drive time",
    calculating: "Calculating…",
    freeDelivery: "Free delivery ✅",
    deliveryFee: "Delivery fee",
    deliveryFees: "Delivery Fees",
    deliveryFeesDesc: "By driving distance from the office",
    fee: "Fee",
    free: "Free",
    over: "Over",
    availableToday: "Available today",
    offToday: "Off today",
    cover: "Cover",
    calcBy: "Calculate delivery by",
    acceptProvinces: "Accept provinces",
    acceptProvincesOff: "Off: only Phnom Penh. A location in a province shows \"Outside Phnom Penh\" – no fee, can't be saved.",
    acceptProvincesOn: "On: provinces are accepted. The fee uses the price table, even for long distances.",
    calcByDesc:
      "Sets the route and the price table used everywhere. Only super admins see this – everyone else just sees one distance and one fee.",
    calcBy_moto:
      "Moto route: may use smaller streets and shortcuts; scooter speeds.",
    calcBy_car:
      "Car route: only roads cars may use (one-ways, wide enough streets); car speeds.",
    inUse: "In use",
    priceInUse: "This price table is in use.",
    priceNotInUse:
      "Not in use – used only if you switch to this vehicle above.",
    tapMapHint: "Tap the map to check a spot",
    installApp: "Install app",
    iosInstallDesc: "Add Aqualife to your Home Screen to open it like an app.",
    iosStep1: "Tap the Share button at the bottom (or top) of Safari.",
    iosStep2: 'Choose "Add to Home Screen", then tap "Add".',
    updateAvailable: "A new version of Aqualife is available.",
    reload: "Reload",
    settings: "Settings",
    settingsDesc:
      "Team accounts, delivery prices, and office location. Changes apply to everyone.",
    team: "Team",
    delivery: "Delivery",
    vehicle: "Vehicle",
    vehicle_moto: "Moto",
    vehicle_car: "Car",
    teamNeedsSupabase:
      "Team management needs the live site connected to Supabase.",
    staffAccounts: "Staff accounts",
    staffAccountsDesc:
      "Change a role, reset a password, revoke access, or delete an account.",
    refresh: "Refresh",
    you: "You",
    noAccess: "No access",
    lastSignIn: "Last sign-in",
    never: "never",
    giveAccess: "Give access…",
    revoke: "Revoke access",
    revokeDesc:
      "They can no longer use the app. The account stays, so you can give access back later by choosing a role.",
    revoked: "Access revoked",
    deleteUserDesc:
      "The account is deleted for good. They will not be able to sign in again.",
    deleted: "Deleted",
    passwordChanged: "Password changed",
    resetPassword: "Reset password",
    changeEmail: "Change email",
    changeEmailDesc:
      "The new email works right away. The password stays the same.",
    emailChanged: "Email changed",
    resetPasswordDesc: "set a new password and give it to them.",
    roleHelp:
      "Super admin: everything + Settings. Admin: map, zones, technicians, customers. Sales / Technician: phone screen with price check only.",
    addStaff: "Add staff",
    addStaffDesc: "Create a login and choose what they can see.",
    created: "Account created",
    giveTheseDetails:
      "Give these login details to the new person (shown once):",
    passwordHint: 'At least 8 characters. Use "Generate" for a strong one.',
    role: "Role",
    createAccount: "Create account",
    show: "Show",
    hide: "Hide",
    generate: "Generate",
    vehicleOn: "Offered – shown to sales and in Customer Check",
    vehicleOff: "Not offered – hidden everywhere",
    upToKm: "Up to (km)",
    addRow: "Add row",
    beyondLast: "After the last row:",
    every: "every",
    undoChanges: "Undo changes",
    savedForEveryone: "Saved – everyone sees the new values now.",
    errNoRows: "add at least one row",
    errKmOrder: '"Up to (km)" must be whole numbers that go up',
    errFee: "fees must be 0 or more",
    errEveryKm: '"every … km" must be 1 or more',
    errNoVehicle: "Turn on at least one vehicle.",
    officeLocation: "Office location",
    officeLocationDesc: "Driving distance and prices are measured from here.",
    pasteLink: "Paste a Google Maps link or coordinates",
    errOffice: "Enter a name and a location in Cambodia.",
    notAdminTitle: "This account has no access",
    notAdminDesc:
      "you are signed in, but this account is not on the Aqualife staff list. Ask the owner to add you.",
    role_superadmin: "Super admin",
    role_admin: "Admin",
    role_sales: "Sales",
    role_technician: "Technician",
    fieldView: "Field view",
    backToDashboard: "Back to dashboard",
    fieldPreviewNote:
      "Preview: this is what Sales and Technicians see on their phones.",
    myLocation: "My location",
    locationError:
      "Could not get your location. Allow location access for this site and try again.",
    editMap: "Edit map",
    doneEditing: "Done",
    lockedHint:
      'Click a zone to see who handles it, then "Edit" to change it. Use "Edit map" to draw new zones or move pins.',
    locked: "Locked",
    edit: "Edit",
    unlockToAdd: 'Click "Edit map" above to add zones.',
    usedBy: "used by",
    colorTaken: "Same color as",
    colorHint: "Faded colors are already used by another technician.",
    customColor: "Any other color",
    addDistricts: "Add Phnom Penh districts",
    addDistrictsTitle: "Add all 14 Phnom Penh districts?",
    addDistrictsDesc:
      "Each khan becomes a zone with its real boundary. Districts you already have (same name) are skipped. Afterwards, click a zone to assign technicians, rename it, or drag its corners.",
    noTechAvailable: "No technician available today",
    saveCustomer: "Save customer",
    customerName: "Customer name",
    note: "Note (optional)",
    notePlaceholder: "e.g. 2 filters, call before arriving",
    customerSaved: "Customer saved",
    saveFailed: "Could not save. See the red message at the top of the page.",
    savedCustomers: "Saved Customers",
    savedCustomersDesc: "Customers checked and assigned to a technician",
    noSavedCustomers:
      'No saved customers yet. Check a location inside a zone, then click "Save customer".',
    searchCustomers: "Search name, phone, address…",
    noCustomerMatch: "No customer matches your search.",
    deleteCustomerDesc:
      "This removes the saved customer for all admins. This cannot be undone.",
    routeError:
      "Could not get driving distance right now. Please try again in a moment.",
    searching: "Searching…",
    noResults: 'No address found. Try another name, or use "Pick on map".',
    min: "min",
    // Technicians
    technicians: "Technicians",
    addTechnician: "Add technician",
    editTechnician: "Edit technician",
    name: "Name",
    color: "Color",
    photoUrl: "Photo link (optional)",
    photoHint: "Paste an image URL. If empty, the first letter is shown.",
    placeHint:
      'New technicians appear next to the office. Use "Move pins" to drag them to their location.',
    confirmDeleteTech: "Delete this technician? Their zones become unassigned.",
    // Login
    login: "Admin sign in",
    welcomeBack: "Welcome back",
    loginSubtitle: "Sign in to the Aqualife admin dashboard",
    forgotPassword: "Forgot your password?",
    forgotHint:
      "Ask the Aqualife owner to reset the password.",
    wrongLogin: "Wrong email or password.",
    adminOnly: "Only Aqualife Teams can sign in.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    loading: "Loading…",
  },
  km: {
    title: "ផែនទីទីតាំងបច្ចេកទេស",
    panels: "ផ្ទាំង",
    deleteZoneDesc:
      "តំបន់នឹងត្រូវលុបសម្រាប់អ្នកគ្រប់គ្រងទាំងអស់។ មិនអាចត្រឡប់វិញបានទេ។",
    deleteTechDesc:
      "តំបន់របស់គេនឹងក្លាយជាមិនទាន់ចាត់តាំង។ មិនអាចត្រឡប់វិញបានទេ។",
    techFormDesc: "ឈ្មោះ ទូរស័ព្ទ ពណ៌ និងរូបថតដែលបង្ហាញលើផែនទី។",
    subtitle: "តំបន់សេវាកម្ម និងអ្នកបច្ចេកទេសនៅភ្នំពេញ",
    demoMode:
      "របៀបសាកល្បង – ទិន្នន័យរក្សាទុកតែក្នុងកម្មវិធីរុករកនេះ។ បន្ថែម Supabase ដើម្បីចែករំលែកជាមួយអ្នកគ្រប់គ្រងទាំងអស់។",
    signOut: "ចាកចេញ",
    drawZone: "គូរតំបន់",
    stopDrawing: "បោះបង់ការគូរ",
    drawHint:
      "ចុចចំណុចជុំវិញតំបន់។ ចុចចំណុចដំបូង (ឬចុច Enter) ដើម្បីបញ្ចប់។ Esc = បោះបង់។",
    editHint:
      'កំពុងកែ៖ គូរតំបន់ថ្មី និងអូសម្ជុល។ ដើម្បីកែតំបន់ ចុចលើវា រួចចុច "កែ" – អូសជ្រុង អូសចំណុចកណ្ដាលដើម្បីបន្ថែម ចុចស្ដាំលើជ្រុងដើម្បីលុប។',
    pickHint: "ចុចកន្លែងណាមួយលើផែនទី ដើម្បីពិនិត្យទីតាំងអតិថិជន។",
    viewAll: "មើលទាំងអស់",
    phone: "ទូរស័ព្ទ",
    zones: "តំបន់",
    noZones: "មិនទាន់មានតំបន់",
    call: "ហៅទូរស័ព្ទ",
    main: "ចម្បង",
    backup: "បម្រុង",
    office: "ការិយាល័យ",
    zone: "តំបន់",
    zoneName: "ឈ្មោះតំបន់",
    mainTech: "អ្នកបច្ចេកទេសចម្បង",
    backupTech: "អ្នកបច្ចេកទេសបម្រុង",
    none: "— គ្មាន —",
    save: "រក្សាទុក",
    saved: "បានរក្សាទុក",
    delete: "លុប",
    close: "បិទ",
    cancel: "បោះបង់",
    confirmDeleteZone: "លុបតំបន់នេះមែនទេ?",
    newZoneHint: "បានគូរតំបន់ថ្មី។ ដាក់ឈ្មោះ និងជ្រើសអ្នកបច្ចេកទេស។",
    serviceAreas: "តំបន់សេវាកម្ម",
    totalArea: "ផ្ទៃសរុប",
    noZonesYet: 'មិនទាន់មានតំបន់។ ចុច "គូរតំបន់" លើផែនទីដើម្បីបន្ថែម។',
    unassigned: "មិនទាន់ចាត់តាំង",
    customerCheck: "ពិនិត្យអតិថិជន",
    searchAddress: "អាសយដ្ឋាន ឬបិទភ្ជាប់តំណ Google Maps…",
    shortLink:
      "តំណខ្លី (maps.app.goo.gl) មិនអាចអានបានទេ។ សូមបើកតំណក្នុងកម្មវិធីរុករក រួចចម្លងអាសយដ្ឋានវែងពីរបារអាសយដ្ឋាន ហើយបិទភ្ជាប់។",
    pickOnMap: "ជ្រើសលើផែនទី",
    picking: "ចុចលើផែនទី…",
    clear: "សម្អាត",
    location: "ទីតាំង",
    insideZone: "តំបន់",
    handledBy: "អ្នកបច្ចេកទេស",
    noTechnician: "មិនមានអ្នកបច្ចេកទេសទទួលខុសត្រូវ",
    outsidePhnomPenh: "នៅក្រៅរាជធានីភ្នំពេញ",
    provinceNotServed: "បច្ចុប្បន្ន យើងផ្តល់សេវាតែក្នុងរាជធានីភ្នំពេញប៉ុណ្ណោះ។ មិនទាន់មានសេវាដឹកជញ្ជូន និងសេវាជួសជុលនៅតាមខេត្តទេ។",
    distance: "ចម្ងាយបើកបរ",
    driveTime: "រយៈពេលបើកបរ",
    calculating: "កំពុងគណនា…",
    freeDelivery: "ដឹកជញ្ជូនឥតគិតថ្លៃ ✅",
    deliveryFee: "ថ្លៃដឹកជញ្ជូន",
    deliveryFees: "តម្លៃដឹកជញ្ជូន",
    deliveryFeesDesc: "តាមចម្ងាយបើកបរពីការិយាល័យ",
    fee: "តម្លៃ",
    free: "ឥតគិតថ្លៃ",
    over: "លើស",
    availableToday: "ធ្វើការថ្ងៃនេះ",
    offToday: "ឈប់ថ្ងៃនេះ",
    cover: "ជំនួស",
    calcBy: "គណនាការដឹកជញ្ជូនតាម",
    acceptProvinces: "ទទួលសេវានៅតាមខេត្ត",
    acceptProvincesOff: "បិទ៖ តែក្នុងរាជធានីភ្នំពេញ។ ទីតាំងនៅតាមខេត្តនឹងបង្ហាញ \"នៅក្រៅរាជធានីភ្នំពេញ\" – គ្មានតម្លៃ និងមិនអាចរក្សាទុកបានទេ។",
    acceptProvincesOn: "បើក៖ ទទួលសេវានៅតាមខេត្ត។ តម្លៃគិតតាមតារាងតម្លៃ ទោះបីចម្ងាយឆ្ងាយក៏ដោយ។",
    calcByDesc:
      "កំណត់ផ្លូវ និងតារាងតម្លៃដែលប្រើគ្រប់កន្លែង។ មានតែអ្នកគ្រប់គ្រងជាន់ខ្ពស់ទេដែលឃើញ – អ្នកផ្សេងឃើញតែចម្ងាយមួយ និងតម្លៃមួយ។",
    calcBy_moto: "ផ្លូវម៉ូតូ៖ អាចប្រើផ្លូវតូច និងផ្លូវកាត់; ល្បឿនម៉ូតូ។",
    calcBy_car:
      "ផ្លូវឡាន៖ ប្រើតែផ្លូវដែលឡានអាចធ្វើដំណើរបាន (ផ្លូវមួយទិស ផ្លូវធំល្មម); ល្បឿនឡាន។",
    inUse: "កំពុងប្រើ",
    priceInUse: "តារាងតម្លៃនេះកំពុងប្រើ។",
    priceNotInUse: "មិនប្រើ – ប្រើតែពេលអ្នកប្ដូរទៅយានយន្តនេះខាងលើ។",
    tapMapHint: "ចុចលើផែនទី ដើម្បីពិនិត្យទីតាំង",
    installApp: "ដំឡើងកម្មវិធី",
    iosInstallDesc: "បន្ថែម Aqualife ទៅអេក្រង់ដើម ដើម្បីបើកវាដូចកម្មវិធី។",
    iosStep1: "ចុចប៊ូតុង ចែករំលែក (Share) នៅខាងក្រោម (ឬខាងលើ) នៃ Safari។",
    iosStep2: 'ជ្រើស "Add to Home Screen" រួចចុច "Add"។',
    updateAvailable: "មានកំណែថ្មីរបស់ Aqualife។",
    reload: "ផ្ទុកឡើងវិញ",
    settings: "ការកំណត់",
    settingsDesc:
      "គណនីបុគ្គលិក តម្លៃដឹកជញ្ជូន និងទីតាំងការិយាល័យ។ ការផ្លាស់ប្ដូរអនុវត្តចំពោះគ្រប់គ្នា។",
    team: "ក្រុម",
    delivery: "ដឹកជញ្ជូន",
    vehicle: "យានយន្ត",
    vehicle_moto: "ម៉ូតូ",
    vehicle_car: "ឡាន",
    teamNeedsSupabase:
      "ការគ្រប់គ្រងក្រុមត្រូវការគេហទំព័រផ្ទាល់ដែលភ្ជាប់ Supabase។",
    staffAccounts: "គណនីបុគ្គលិក",
    staffAccountsDesc: "ប្ដូរតួនាទី កំណត់ពាក្យសម្ងាត់ថ្មី ដកសិទ្ធិ ឬលុបគណនី។",
    refresh: "ផ្ទុកឡើងវិញ",
    you: "អ្នក",
    noAccess: "គ្មានសិទ្ធិ",
    lastSignIn: "ចូលចុងក្រោយ",
    never: "មិនដែល",
    giveAccess: "ផ្ដល់សិទ្ធិ…",
    revoke: "ដកសិទ្ធិ",
    revokeDesc:
      "គេនឹងមិនអាចប្រើកម្មវិធីទៀតទេ។ គណនីនៅដដែល អ្នកអាចផ្ដល់សិទ្ធិវិញដោយជ្រើសតួនាទី។",
    revoked: "បានដកសិទ្ធិ",
    deleteUserDesc: "គណនីនឹងត្រូវលុបជាអចិន្ត្រៃយ៍។ គេនឹងមិនអាចចូលបានទៀតទេ។",
    deleted: "បានលុប",
    passwordChanged: "បានប្ដូរពាក្យសម្ងាត់",
    resetPassword: "កំណត់ពាក្យសម្ងាត់ថ្មី",
    changeEmail: "ប្ដូរអ៊ីមែល",
    changeEmailDesc: "អ៊ីមែលថ្មីប្រើបានភ្លាមៗ។ ពាក្យសម្ងាត់នៅដដែល។",
    emailChanged: "បានប្ដូរអ៊ីមែល",
    resetPasswordDesc: "កំណត់ពាក្យសម្ងាត់ថ្មី ហើយផ្ដល់ឱ្យគេ។",
    roleHelp:
      "អ្នកគ្រប់គ្រងជាន់ខ្ពស់៖ ទាំងអស់ + ការកំណត់។ អ្នកគ្រប់គ្រង៖ ផែនទី តំបន់ អ្នកបច្ចេកទេស អតិថិជន។ លក់ / អ្នកបច្ចេកទេស៖ អេក្រង់ទូរស័ព្ទសម្រាប់ពិនិត្យតម្លៃប៉ុណ្ណោះ។",
    addStaff: "បន្ថែមបុគ្គលិក",
    addStaffDesc: "បង្កើតការចូល និងជ្រើសអ្វីដែលគេអាចមើលឃើញ។",
    created: "បានបង្កើតគណនី",
    giveTheseDetails: "ផ្ដល់ព័ត៌មានចូលទាំងនេះទៅបុគ្គលិកថ្មី (បង្ហាញតែម្ដង)៖",
    passwordHint: 'យ៉ាងតិច ៨ តួ។ ប្រើ "បង្កើត" សម្រាប់ពាក្យសម្ងាត់រឹងមាំ។',
    role: "តួនាទី",
    createAccount: "បង្កើតគណនី",
    show: "បង្ហាញ",
    hide: "លាក់",
    generate: "បង្កើត",
    vehicleOn: "មានផ្ដល់ជូន – បង្ហាញដល់ផ្នែកលក់ និងក្នុងការពិនិត្យអតិថិជន",
    vehicleOff: "មិនផ្ដល់ជូន – លាក់គ្រប់កន្លែង",
    upToKm: "រហូតដល់ (គ.ម)",
    addRow: "បន្ថែមជួរ",
    beyondLast: "ក្រោយជួរចុងក្រោយ៖",
    every: "រៀងរាល់",
    undoChanges: "បោះបង់ការផ្លាស់ប្ដូរ",
    savedForEveryone: "បានរក្សាទុក – គ្រប់គ្នាឃើញតម្លៃថ្មីឥឡូវនេះ។",
    errNoRows: "បន្ថែមយ៉ាងហោចណាស់មួយជួរ",
    errKmOrder: '"រហូតដល់ (គ.ម)" ត្រូវជាលេខគត់ដែលកើនឡើង',
    errFee: "តម្លៃត្រូវតែ 0 ឬច្រើនជាងនេះ",
    errEveryKm: '"រៀងរាល់ … គ.ម" ត្រូវតែ 1 ឬច្រើនជាងនេះ',
    errNoVehicle: "បើកយ៉ាងហោចណាស់យានយន្តមួយ។",
    officeLocation: "ទីតាំងការិយាល័យ",
    officeLocationDesc: "ចម្ងាយបើកបរ និងតម្លៃត្រូវបានវាស់ពីទីនេះ។",
    pasteLink: "បិទភ្ជាប់តំណ Google Maps ឬកូអរដោនេ",
    errOffice: "បញ្ចូលឈ្មោះ និងទីតាំងក្នុងប្រទេសកម្ពុជា។",
    notAdminTitle: "គណនីនេះគ្មានសិទ្ធិចូលប្រើទេ",
    notAdminDesc:
      "អ្នកបានចូលហើយ ប៉ុន្តែគណនីនេះមិននៅក្នុងបញ្ជីបុគ្គលិក Aqualife ទេ។ សូមស្នើម្ចាស់ឱ្យបន្ថែមអ្នក។",
    role_superadmin: "អ្នកគ្រប់គ្រងជាន់ខ្ពស់",
    role_admin: "អ្នកគ្រប់គ្រង",
    role_sales: "លក់",
    role_technician: "អ្នកបច្ចេកទេស",
    fieldView: "ទិដ្ឋភាពទូរស័ព្ទ",
    backToDashboard: "ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង",
    fieldPreviewNote:
      "មើលជាមុន៖ នេះជាអ្វីដែលផ្នែកលក់ និងអ្នកបច្ចេកទេសឃើញនៅលើទូរស័ព្ទ។",
    myLocation: "ទីតាំងខ្ញុំ",
    locationError:
      "មិនអាចយកទីតាំងរបស់អ្នកបានទេ។ សូមអនុញ្ញាតការចូលប្រើទីតាំងសម្រាប់គេហទំព័រនេះ ហើយព្យាយាមម្ដងទៀត។",
    editMap: "កែផែនទី",
    doneEditing: "រួចរាល់",
    lockedHint:
      'ចុចលើតំបន់ដើម្បីមើលអ្នកទទួលខុសត្រូវ បន្ទាប់មកចុច "កែ" ដើម្បីកែ។ ប្រើ "កែផែនទី" ដើម្បីគូរតំបន់ថ្មី ឬផ្លាស់ទីម្ជុល។',
    locked: "ចាក់សោ",
    edit: "កែ",
    unlockToAdd: 'ចុច "កែផែនទី" ខាងលើ ដើម្បីបន្ថែមតំបន់។',
    usedBy: "ប្រើដោយ",
    colorTaken: "ពណ៌ដូចគ្នានឹង",
    colorHint: "ពណ៌ស្រាលគឺមានអ្នកបច្ចេកទេសផ្សេងប្រើរួចហើយ។",
    customColor: "ពណ៌ផ្សេងទៀត",
    addDistricts: "បន្ថែមខណ្ឌភ្នំពេញ",
    addDistrictsTitle: "បន្ថែមខណ្ឌទាំង ១៤ នៃភ្នំពេញ?",
    addDistrictsDesc:
      "ខណ្ឌនីមួយៗនឹងក្លាយជាតំបន់មួយតាមព្រំដែនពិត។ ខណ្ឌដែលមានរួចហើយ (ឈ្មោះដូចគ្នា) នឹងរំលង។ បន្ទាប់មក ចុចលើតំបន់ដើម្បីចាត់តាំងអ្នកបច្ចេកទេស ប្ដូរឈ្មោះ ឬអូសជ្រុង។",
    noTechAvailable: "គ្មានអ្នកបច្ចេកទេសធ្វើការថ្ងៃនេះ",
    saveCustomer: "រក្សាទុកអតិថិជន",
    customerName: "ឈ្មោះអតិថិជន",
    note: "កំណត់ចំណាំ (ស្រេចចិត្ត)",
    notePlaceholder: "ឧ. តម្រង ២ ហៅទូរស័ព្ទមុនមកដល់",
    customerSaved: "បានរក្សាទុកអតិថិជន",
    saveFailed: "មិនអាចរក្សាទុកបានទេ។ សូមមើលសារពណ៌ក្រហមនៅខាងលើទំព័រ។",
    savedCustomers: "អតិថិជនដែលបានរក្សាទុក",
    savedCustomersDesc: "អតិថិជនដែលបានពិនិត្យ និងចាត់តាំងអ្នកបច្ចេកទេស",
    noSavedCustomers:
      'មិនទាន់មានអតិថិជនរក្សាទុក។ ពិនិត្យទីតាំងក្នុងតំបន់ រួចចុច "រក្សាទុកអតិថិជន"។',
    searchCustomers: "ស្វែងរកឈ្មោះ ទូរស័ព្ទ អាសយដ្ឋាន…",
    noCustomerMatch: "រកមិនឃើញអតិថិជនដែលត្រូវនឹងការស្វែងរក។",
    deleteCustomerDesc:
      "នេះនឹងលុបអតិថិជនសម្រាប់អ្នកគ្រប់គ្រងទាំងអស់។ មិនអាចត្រឡប់វិញបានទេ។",
    routeError: "មិនអាចគណនាចម្ងាយបើកបរបានទេឥឡូវនេះ។ សូមព្យាយាមម្ដងទៀត។",
    searching: "កំពុងស្វែងរក…",
    noResults: 'រកមិនឃើញអាសយដ្ឋាន។ សាកឈ្មោះផ្សេង ឬប្រើ "ជ្រើសលើផែនទី"។',
    min: "នាទី",
    technicians: "អ្នកបច្ចេកទេស",
    addTechnician: "បន្ថែមអ្នកបច្ចេកទេស",
    editTechnician: "កែអ្នកបច្ចេកទេស",
    name: "ឈ្មោះ",
    color: "ពណ៌",
    photoUrl: "តំណរូបថត (ស្រេចចិត្ត)",
    photoHint: "បិទភ្ជាប់តំណរូបភាព។ បើទទេ នឹងបង្ហាញអក្សរទីមួយ។",
    placeHint:
      'អ្នកបច្ចេកទេសថ្មីបង្ហាញក្បែរការិយាល័យ។ ប្រើ "ផ្លាស់ទីម្ជុល" ដើម្បីអូសទៅទីតាំងរបស់គេ។',
    confirmDeleteTech:
      "លុបអ្នកបច្ចេកទេសនេះមែនទេ? តំបន់របស់គេនឹងក្លាយជាមិនទាន់ចាត់តាំង។",
    login: "ចូលសម្រាប់អ្នកគ្រប់គ្រង",
    welcomeBack: "សូមស្វាគមន៍",
    loginSubtitle: "ចូលទៅផ្ទាំងគ្រប់គ្រង Aqualife",
    forgotPassword: "ភ្លេចពាក្យសម្ងាត់?",
    forgotHint:
      "សូមស្នើម្ចាស់ Aqualife ឱ្យកំណត់ពាក្យសម្ងាត់ឡើងវិញ។",
    wrongLogin: "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។",
    adminOnly: "មានតែក្រុមការងារ Aqualife ទេដែលអាចចូលបាន។",
    email: "អ៊ីមែល",
    password: "ពាក្យសម្ងាត់",
    signIn: "ចូល",
    loading: "កំពុងផ្ទុក…",
  },
};

const LanguageContext = createContext(null);

// Wrap the app with this so every component can read the language.
export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("aqulife-lang") || "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("aqulife-lang", lang);
    } catch {
      /* private mode: ignore */
    }
  }, [lang]);

  // t('key') returns the text in the current language (falls back to English).
  const t = (key) => text[lang]?.[key] ?? text.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// Language picker.
//   variant "switch" (default): shadcn Switch, off = English, on = Khmer (dashboard header)
//   variant "card": two options in a small card, the chosen one highlighted (login page)
export function LanguageSwitch({ variant = "switch" }) {
  const { lang, setLang } = useLanguage();
  const isKhmer = lang === "km";

  if (variant === "card") {
    const option = (code, label) => (
      <button
        type="button"
        onClick={() => setLang(code)}
        aria-pressed={lang === code}
        className={`h-6 rounded-md px-2 text-xs font-medium transition-colors ${
          lang === code
            ? "bg-background text-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
      </button>
    );
    return (
      <div
        className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5"
        role="group"
        aria-label="Language"
      >
        <Globe
          className="mx-1 size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        {option("en", "EN")}
        {option("km", "ខ្មែរ")}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Clicking a label picks that language. */}
      <Label
        className={`cursor-pointer ${isKhmer ? "text-muted-foreground" : ""}`}
        onClick={() => setLang("en")}
      >
        EN
      </Label>
      <Switch
        id="lang-switch"
        checked={isKhmer}
        onCheckedChange={(on) => setLang(on ? "km" : "en")}
        aria-label="English / Khmer"
      />
      <Label
        className={`cursor-pointer ${isKhmer ? "" : "text-muted-foreground"}`}
        onClick={() => setLang("km")}
      >
        ខ្មែរ
      </Label>
    </div>
  );
}
