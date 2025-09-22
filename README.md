# MSRS Client

A decentralized streaming platform client built with React and TypeScript, enabling peer-to-peer video/audio streaming through the Swarm network with integrated real-time chat functionality.

## 🌟 Features

### Core Streaming Capabilities

- **Decentralized Video/Audio Streaming**: Stream content through the Swarm network using HLS protocol
- **Stream Management**: Create, edit, and manage your streams with metadata persistence
- **Real-time Chat**: Interactive chat system integrated with each stream
- **Media Type Support**: Both video and audio streaming capabilities
- **Scheduled Streaming**: Plan and schedule streams for future broadcast

### User Experience

- **Stream Browser**: Discover and browse available streams
- **Stream Watcher**: Watch streams with integrated chat and media controls
- **Responsive Design**: Optimized for desktop and mobile viewing
- **User Authentication**: Ethereum wallet-based authentication system - WIP -
- **Admin Controls**: Protected routes for stream creators and administrators

### Technical Features

- **Swarm Integration**: Built on Ethereum Swarm for decentralized storage and streaming
- **Custom HLS Player**: Specialized player for Swarm-based streaming with adaptive bitrate
- **Real-time Updates**: Live stream state synchronization across clients
- **Thumbnail Support**: Upload and display stream preview images
- **Error Handling**: Comprehensive error management and user feedback

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (see `.nvmrc` for exact version)
- **pnpm** package manager
- **Ethereum wallet** (MetaMask or compatible)
- **Swarm Bee node** access (local or remote)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Solar-Punk-Ltd/msrs-client.git
   cd msrs-client
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Environment Configuration**

   ```bash
   cp .env.sample .env
   ```

   Configure the following environment variables in `.env`:

   ```env
   VITE_READER_BEE_URL=http://localhost:1633        # Swarm Bee node for reading
   VITE_WRITER_BEE_URL=http://localhost:1633        # Swarm Bee node for writing
   VITE_STAMP=your_postage_stamp_id                 # Swarm postage stamp
   VITE_STREAM_STATE_OWNER=owner_address            # Stream state owner
   VITE_STREAM_STATE_TOPIC=state_topic              # Stream state topic
   VITE_CHAT_GSOC_RESOURCE_ID=chat_resource_id      # Chat resource identifier
   VITE_CHAT_GSOC_TOPIC=chat_topic                  # Chat topic
   VITE_STREAMER_GSOC_RESOURCE_ID=streamer_resource # Streamer resource ID
   VITE_STREAMER_GSOC_TOPIC=streamer_topic          # Streamer topic
   ```

4. **Start development server**

   ```bash
   pnpm dev
   ```

   The application will be available at `http://localhost:5173`

### Building for Production

```bash
pnpm build
```

The built application will be in the `dist` directory, ready for deployment.

## 📱 Application Structure

### Main Routes

- **`/`** - Stream Browser (discover available streams)
- **`/watch/:mediatype/:owner/:topic`** - Stream Watcher (watch and chat)
- **`/create`** - Create New Stream (admin only)
- **`/edit/:owner/:topic`** - Edit Stream (admin only)
- **`/manage`** - Stream Management (admin only)

### Key Components

#### Stream Management

- **StreamBrowser**: Browse and discover available streams
- **StreamWatcher**: Watch streams with integrated chat
- **StreamForm**: Create and edit stream metadata
- **StreamManager**: Manage your streams (edit, delete, generate tokens)

#### Media & Chat

- **SwarmHlsPlayer**: Custom HLS player for Swarm streaming
- **Chat**: Real-time chat system with emoji support
- **StreamList**: Display and filter available streams

#### Authentication & Layout

- **AdminGuard**: Protected route component for authenticated users
- **LoginModal**: Ethereum wallet connection interface
- **MainLayout**: Application layout with navigation and status

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button/         # Button component with variants
│   ├── Chat/           # Chat system components
│   ├── SwarmHlsPlayer/ # Custom HLS player for Swarm
│   └── Stream/         # Stream-related components
├── hooks/              # Custom React hooks
├── layouts/            # Page layout components
├── pages/              # Main application pages
├── providers/          # React context providers
├── styles/             # Global styles and variables
├── types/              # TypeScript type definitions
└── utils/              # Utility functions and helpers
```

## 🧪 Testing

The project includes comprehensive testing with 79+ tests covering:

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test --ui
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t msrs-client .

# Run container
docker run -p 80:80 msrs-client
```

### Manual Deployment

1. Build the application: `pnpm build`
2. Deploy the `dist` directory to your web server
3. Configure nginx or similar server for SPA routing

### Environment Requirements

- **Swarm Bee Node**: Access to a Swarm Bee node for decentralized storage
- **Postage Stamps**: Valid Swarm postage stamps for data upload
- **HTTPS**: Required for wallet connection and media streaming

## 🔧 Development

### Code Quality

```bash
# Linting
pnpm lint

# Type checking
pnpm typecheck

# Code formatting (handled by Prettier)
# Runs automatically on commit via Husky
```

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new streaming feature
fix: resolve chat connection issue
docs: update API documentation
test: add stream management tests
```

### Development Guidelines

- Write tests for new features and bug fixes
- Follow the existing code style and patterns
- Update documentation for API changes
- Ensure all tests pass before submitting

## 📜 License

This project is part of the Solar Punk ecosystem. Please see the license file for details.

## 🔗 Related Projects

- **[Ethereum Swarm](https://ethswarm.org/)** - Decentralized storage and communication
- **[Bee Client](https://github.com/ethersphere/bee)** - Swarm Bee node implementation
- **[Swarm Chat JS](https://github.com/Solar-Punk-Ltd/swarm-chat-js)** - Real-time chat library
