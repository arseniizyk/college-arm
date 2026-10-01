export const ADMIN_ROUTE = '/admin'
export const LOGIN_ROUTE = '/login'
export const REGISTRSTION_ROUTE = '/registration'
export const MAIN_ROUTE = '/'
export const REQUEST_ROUTE = '/request'
export const PROFILE_ROUTE = '/profile'
export const PRIVACY_ROUTE = '/privacy'

export const ITEMS_PER_PAGE = 10
export const MIN_PASSWORD_LENGTH = 4
const ROLES_WITH_MULTIPLE_STUDENTS = ['ADMIN', 'TEACHER']

export const canSelectMultipleStudents = (userRole) =>
  ROLES_WITH_MULTIPLE_STUDENTS.includes(userRole)

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