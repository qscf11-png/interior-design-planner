import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyDA-868ZUbI5rd6eN8YqIznS27Ncdqjjak',
  authDomain: 'tk-private.firebaseapp.com',
  projectId: 'tk-private',
  storageBucket: 'tk-private.firebasestorage.app',
  messagingSenderId: '392798264555',
  appId: '1:392798264555:web:e8ed47934f18ec2feef2ae',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
