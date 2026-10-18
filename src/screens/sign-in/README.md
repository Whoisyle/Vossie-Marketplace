# Vossie Sign-In Prototype

The Welcome screen’s “Sign In with Eduvos” action opens this Vossie-branded, locally interactive screen. Its layout takes inspiration from the supplied sign-in reference while using Vossie artwork and avoiding Microsoft branding or a copy of its provider page.

The composition uses the white Vossie wordmark in the upper teal bubble, a second Vossie wordmark in the centered white sign-in card, and a large lower bubble. The card contains an email-only field, account-help link, and blue Next button. The layout accounts for the device safe area and keeps the form scrollable and keyboard-aware.

The email field validates address format only; it does not verify a student, account, or institution membership. A valid address advances to an explicit connection status: Eduvos sign-in is not connected and no one has been signed in. No password is requested, no network request is made, and no session or persisted credential is created. The entered address exists only in screen memory and is cleared when this route loses focus.

Account help directs people to Eduvos’s official identity provider for recovery. No recovery URL or support contact is configured. A production sign-in requires institution-approved identity-provider configuration and a separately reviewed integration before this local flow can be replaced.
