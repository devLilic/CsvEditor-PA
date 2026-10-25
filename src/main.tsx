// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

import './styles/index.css'


import { applyUiTheme } from '@/features/theme/themeResolver'
import { settingsService } from '@/features/csv-editor/services/settingsService'

applyUiTheme(document.documentElement)
void settingsService.restoreUiTheme(document.documentElement)

ReactDOM.createRoot(
    document.getElementById('root')!
).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
