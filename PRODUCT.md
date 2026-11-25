# Swyft

<!-- impeccable:product-schema 1 -->

## Platform
adaptive

## Stack
Expo and React Native with TypeScript and NativeWind for the customer app; Express, Prisma, and PostgreSQL for the API; React and Vite for the owner panel.

## Users
Customers booking an appointment, and a service business owner managing the schedule. The first demonstration uses a salon.

## Product Purpose
Customers can find a service and an available time, book it, and manage their appointments. Owners can see all bookings and update their status.

## Capabilities and Constraints
Email and password sign-in, backend-issued JWTs, services with duration and price, available time slots, booking confirmation and history, cancellation and rescheduling, owner booking management, and reminders 24 hours and 1 hour before an appointment. A booked slot must be protected against concurrent reservations.

## Brand Commitments
The mobile app name is Swyft. The repository folder is `service-booking-app`. The interface should have a distinct, carefully crafted look rather than generic generated UI.

## Evidence on Hand
No customer photography, logo, testimonials, or real business catalog has been supplied. Demo services and prices are illustrative.

## Product Principles
- Make the next available appointment easy to understand.
- Make time, duration, and price explicit before confirmation.
- Keep cancellation and rescheduling easy to find.
- Let the owner trust the schedule as a single source of truth.
