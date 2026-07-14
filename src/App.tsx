import { Routes, Route, Navigate } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { SignUp } from './pages/app/SignUp'
import { Upload } from './pages/app/Upload'
import { ResumeBuilder } from './pages/app/ResumeBuilder'
import { AiResumeBuilder } from './pages/app/AiResumeBuilder'
import { ConfirmInfo } from './pages/app/ConfirmInfo'
import { Discovery } from './pages/app/Discovery'
import { Dashboard } from './pages/app/Dashboard'
import { FitCheck } from './pages/app/FitCheck'
import { CheatGen } from './pages/app/CheatGen'
import { CheatSheet } from './pages/app/CheatSheet'
import { Paywall } from './pages/app/Paywall'
import { SignIn } from './pages/auth/SignIn'
import { Onboarding } from './pages/auth/Onboarding'
import { Account } from './pages/auth/Account'

export function App() {
  return (
    <Routes>
      {/* Marketing */}
      <Route path="/" element={<Landing />} />

      {/* Auth & onboarding */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/account" element={<Account />} />

      {/* App flow */}
      <Route path="/signup" element={<SignUp />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/builder" element={<ResumeBuilder />} />
      <Route path="/ai-resume" element={<AiResumeBuilder />} />
      <Route path="/confirm" element={<ConfirmInfo />} />
      <Route path="/discovery" element={<Discovery />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/fit" element={<FitCheck />} />
      <Route path="/cheat-generating" element={<CheatGen />} />
      <Route path="/cheatsheet" element={<CheatSheet />} />
      <Route path="/paywall" element={<Paywall />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
