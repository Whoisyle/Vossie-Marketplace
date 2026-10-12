# QR sign in

Native camera-based Eduvos QR scanning screen. The supplied screen reference
and icon references are kept in the page-local `assets/` folders for traceable
design handoff; the runtime screen uses the device camera and shared Vossie
wordmark so it scales to the actual iPhone safe area.

QR detection is implemented locally and pauses after one scan. Eduvos identity
verification is intentionally not faked: a canonical QR payload contract and
approved authentication exchange are still required before a scan can create a
session.
