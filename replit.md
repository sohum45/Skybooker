# AirConnect - Flight Booking System

## Overview

AirConnect is a modern flight booking platform built with a full-stack TypeScript architecture. The application features intelligent route optimization using graph algorithms (Dijkstra and A*), dynamic pricing with real-time demand factors, and an intuitive user interface. The system supports flight search, booking management, and administrative controls for pricing configuration.

The platform is designed as a monorepo with clear separation between client-side React application, server-side Express API, and shared type definitions. It implements modern web development practices including real-time WebSocket communication, comprehensive authentication, and responsive design.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Maps Integration**: Leaflet for interactive route visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints with rate limiting and CORS protection
- **Real-time Communication**: WebSocket server for live updates and notifications
- **Authentication**: JWT-based auth with access/refresh token pattern
- **Security**: Helmet for security headers, bcrypt for password hashing

### Database & ORM
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Drizzle Kit for schema management
- **Schema**: Relational design with users, airports, routes, bookings, and pricing config

### Core Business Logic
- **Route Computing**: Graph algorithms (Dijkstra and A*) for optimal path finding
- **Pricing Engine**: Dynamic fare calculation with demand factors, fuel costs, and taxes
- **Booking System**: PNR generation and booking lifecycle management
- **Admin Controls**: Real-time pricing configuration and system monitoring

### Data Models
- **Users**: Authentication and role-based access (user/admin)
- **Airports**: Geographic data with IATA codes and coordinates
- **Routes**: Bidirectional flight connections with distance calculations
- **Bookings**: Complete booking records with fare breakdowns
- **Price Configuration**: Dynamic pricing parameters for admin control

### Authentication & Authorization
- **JWT Tokens**: Access tokens (15min) and refresh tokens (7 days)
- **Role-based Access**: User and admin roles with different permissions
- **Session Management**: Secure token storage and automatic refresh
- **Rate Limiting**: Protection against brute force attacks

### Real-time Features
- **WebSocket Integration**: Live booking notifications and price updates
- **Activity Feeds**: Real-time admin dashboard with system events
- **Price Monitoring**: Dynamic pricing updates based on demand

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **WebSocket (ws)**: Real-time bidirectional communication
- **Leaflet**: Interactive mapping for route visualization

### Authentication & Security
- **bcrypt**: Secure password hashing
- **jsonwebtoken**: JWT token generation and verification
- **helmet**: Security middleware for Express
- **express-rate-limit**: API rate limiting protection

### Development & Build Tools
- **Vite**: Fast development server and optimized production builds
- **esbuild**: High-performance JavaScript bundler for server code
- **TypeScript**: Static type checking across the entire codebase
- **Drizzle Kit**: Database schema management and migrations

### UI & Styling
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Consistent icon library
- **Google Fonts**: Inter font family for typography

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **nanoid**: URL-safe unique ID generation
- **clsx/tailwind-merge**: Conditional CSS class management
- **class-variance-authority**: Component variant management