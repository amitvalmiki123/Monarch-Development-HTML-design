import { SettingsSubPage, PasscodeLockSettings, TwoStepSettings, ActiveSessionsSettings } from './shared';

export default function PrivacySecurityPage({ onBack }) {
  return (
    <SettingsSubPage title="Privacy and Security" onBack={onBack}>
      <div className="settings-section">
        <PasscodeLockSettings />
        <TwoStepSettings />
        <ActiveSessionsSettings />
      </div>
    </SettingsSubPage>
  );
}
