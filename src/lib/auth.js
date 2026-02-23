const AUTH_SECRET = import.meta.env.VITE_AUTH_SECRET_KEY || 'fallback_dev_key'

export const generatePassword = (phone) => {
  return `${phone}_${AUTH_SECRET}`
}

export const generateEmail = (phone) => {
  return `${phone}@gitty.app`
}
