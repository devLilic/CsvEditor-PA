// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import './styles/index.css'


import { CsvProvider } from '@/features/csv-editor'

ReactDOM.createRoot(
    document.getElementById('root')!
).render(
    <React.StrictMode>
        <CsvProvider>
            <App />
        </CsvProvider>
    </React.StrictMode>
)
