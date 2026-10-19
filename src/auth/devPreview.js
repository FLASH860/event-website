// DEV ONLY: lets you look at the team/admin layouts locally without a backend.
// `import.meta.env.DEV` is false in production builds, so this can never ship enabled.
// It is NOT authentication and grants no access to real data.
export const DEV_PREVIEW = import.meta.env.DEV && import.meta.env.VITE_DEV_PREVIEW === 'true'
const KEY = 'ras_dev_preview_role'
export const getPreviewRole = () => (DEV_PREVIEW ? sessionStorage.getItem(KEY) : null)
export const setPreviewRole = (role) => (role ? sessionStorage.setItem(KEY, role) : sessionStorage.removeItem(KEY))
