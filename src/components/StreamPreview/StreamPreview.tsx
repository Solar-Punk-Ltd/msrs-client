import './StreamPreview.scss';

interface StreamPreviewProps {
  owner?: string;
  topic?: string;
}

export function StreamPreview({ owner, topic: _topic }: StreamPreviewProps) {
  const mockStreamData = {
    name: 'Live Tech Discussion',
    description:
      "Join us for an exciting discussion about the latest technology trends, covering AI, blockchain, and web development. We'll dive deep into emerging technologies and their impact on the future. This session will explore cutting-edge innovations in machine learning, artificial intelligence, decentralized systems, and modern web frameworks. Whether you're a seasoned developer or just starting your tech journey, you'll find valuable insights and practical knowledge to advance your career. We'll cover topics like React, Vue, Node.js, Python, smart contracts, NFTs, DeFi protocols, cloud computing, serverless architecture, microservices, DevOps practices, and much more. Don't miss this opportunity to connect with fellow tech enthusiasts and industry experts.",
    scheduledStartTime: new Date('2025-08-29T15:30:00'),
    owner: owner || 'Unknown',
    status: 'scheduled',
  };

  return (
    <div className="stream-item-preview">
      <div className="stream-preview-header">
        <h1 className="stream-preview-title">{mockStreamData.name}</h1>
      </div>

      <div className="stream-preview-content">
        <div className="stream-preview-description">
          <h3>Description</h3>
          <p>{mockStreamData.description}</p>
        </div>

        <div className="stream-preview-schedule">
          <h3>Scheduled Start</h3>
          <p>{mockStreamData.scheduledStartTime.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
