import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider } from './firebase'

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user') return null
    if (e.code === 'auth/popup-blocked') throw new Error('瀏覽器封鎖了登入彈窗，請允許彈窗後重試')
    throw e
  }
}

export async function logOut() {
  await signOut(auth)
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}
