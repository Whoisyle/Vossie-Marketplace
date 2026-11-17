/**
 * Whether a person is looking at the Operations review screen. While someone is, the demo's automatic "Vossie Operations
 * accepts the next document" stays still, so the documents are theirs to accept or turn down. Demo only.
 */
let open = 0;

export const reviewDesk = {
  enter(): void {
    open += 1;
  },
  isOpen(): boolean {
    return open > 0;
  },
  leave(): void {
    open = Math.max(0, open - 1);
  },
};
