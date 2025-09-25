import './StampInfoPanel.scss';

const STAMP_INFO = {
  title: 'Understanding MSRS Stamps',
  paragraphs: [
    'Stamps are required to keep data alive on the Swarm network. Within MSRS, stamps are managed through our Swarm gateway, but it is important to understand how they are used.',
    'The system relies on two categories of stamps. First, there are three public stamps that power the core application itself. These are responsible for feeds, notifications, and other essential features that allow MSRS to function properly.',
    'In addition, there are ten private stamps dedicated to streams. Each stream operates with two stamps: one manages the storage and distribution of media, while the other ensures that chat messages remain available.',
    'Whenever you want to make sure your creations stay visible and accessible on Swarm, you should top up the corresponding stamps. Keeping these stamps funded guarantees that both the application features and your streams continue to run without interruption.',
  ],
};

export function StampInfoPanel() {
  return (
    <div className="stamp-info-dropdown">
      <div className="stamp-info-content">
        <h3>{STAMP_INFO.title}</h3>
        {STAMP_INFO.paragraphs.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
