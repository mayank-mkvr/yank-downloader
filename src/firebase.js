import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA8457Vu5D3k6hipciXb5v-uPoN8MKGBag",
  authDomain: "ytdownloader-7c472.firebaseapp.com",
  projectId: "ytdownloader-7c472",
  storageBucket: "ytdownloader-7c472.firebasestorage.app",
  messagingSenderId: "723884544864",
  appId: "1:723884544864:web:d06f38c099e27861918405",
  measurementId: "G-X08QW0CN76"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export default app;