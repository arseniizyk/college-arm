export const ADMIN_ROUTE = '/admin'
export const LOGIN_ROUTE = '/login'
export const MAIN_ROUTE = '/'
export const PROFILE_ROUTE = '/profile'
export const PRIVACY_ROUTE = '/privacy'

export const ITEMS_PER_PAGE = 10
export const MIN_PASSWORD_LENGTH = 4

export const ORDER_DOC_TYPES = [
  'exam-admission',
  'holidays',
  'stipend',
  'snow-cleaning',
  'student-direction',
  'health',
  'transfer',
  'duplicate-ticket',
  'enrollment',
  'release',
]

export const orderUrl = (docType) => `/api/generate/admin/orders/${docType}`

export const practiceContractUrl = () => '/api/generate/admin/practice-contract'

export const studyCertificateUrl = () => '/api/generate/study-certificate'
