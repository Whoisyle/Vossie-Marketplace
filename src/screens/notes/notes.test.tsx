import { fireEvent, screen } from "@testing-library/react-native";

import { formatRand } from "@/data/format";
import { createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { ListingDetailScreen } from "../listing/ListingDetailScreen";
import { MyNotesScreen, NotesBrowseScreen, NotesReaderScreen } from "./NotesScreens";

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: { id?: string } = { id: "notes-itma101" };

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/home/notes",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), push: mockPush, replace: mockReplace }),
}));

const signedIn = (): DemoState => demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockParams = { id: "notes-itma101" };
});

describe("study notes screens", () => {
  it("lists every pack and narrows by campus", () => {
    renderWithProviders(<NotesBrowseScreen />, signedIn());
    expect(screen.getByText("6 packs")).toBeTruthy();
    fireEvent.press(screen.getByTestId("notes-campus-pretoria"));
    expect(screen.getByText("2 packs")).toBeTruthy();
    expect(screen.getByTestId("notes-row-notes-itpr101")).toBeTruthy();
    expect(screen.queryByTestId("notes-row-notes-itma101")).toBeNull();
  });

  it("opens a pack's page from the list", () => {
    renderWithProviders(<NotesBrowseScreen />, signedIn());
    fireEvent.press(screen.getByTestId("notes-row-notes-itma101"));
    expect(mockPush).toHaveBeenCalledWith("/home/listing/notes-itma101");
  });

  it("shows the notes facts instead of delivery details on a pack's page", () => {
    renderWithProviders(<ListingDetailScreen />, signedIn());
    expect(screen.getByTestId("notes-facts")).toBeTruthy();
    expect(screen.getByText("ITMA101")).toBeTruthy();
    expect(screen.getByText("Potchefstroom")).toBeTruthy();
    expect(screen.queryByTestId("add-to-cart")).toBeNull();
    expect(screen.getByTestId("notes-buy")).toBeTruthy();
  });

  it("buys a pack and then offers to open it", () => {
    renderWithProviders(<ListingDetailScreen />, signedIn());
    fireEvent.press(screen.getByTestId("notes-buy"));
    expect(screen.getByTestId("notes-total")).toHaveTextContent(formatRand(3000));
    fireEvent.press(screen.getByTestId("notes-pay"));
    expect(mockPush).toHaveBeenCalledWith("/account/notes-read/notes-itma101");
    expect(screen.getByTestId("notes-open")).toBeTruthy();
  });

  it("locks the pages after the preview until the pack is bought", () => {
    renderWithProviders(<NotesReaderScreen />, signedIn());
    expect(screen.getByTestId("notes-page")).toBeTruthy();
    fireEvent.press(screen.getByTestId("notes-next"));
    expect(screen.getByTestId("notes-page")).toBeTruthy();
    fireEvent.press(screen.getByTestId("notes-next"));
    expect(screen.getByTestId("notes-locked")).toBeTruthy();
  });

  it("opens every page once the pack is owned", () => {
    const owned = demoReducer(signedIn(), { listingId: "notes-itma101", type: "buyNotes" });
    renderWithProviders(<NotesReaderScreen />, owned);
    for (let i = 0; i < 3; i += 1) fireEvent.press(screen.getByTestId("notes-next"));
    expect(screen.queryByTestId("notes-locked")).toBeNull();
    expect(screen.getByTestId("notes-page-label")).toHaveTextContent("Page 4 of 6");
  });

  it("shows bought packs in My study notes", () => {
    renderWithProviders(<MyNotesScreen />, signedIn());
    expect(screen.getByText("No notes yet")).toBeTruthy();
  });

  it("lists a bought pack in My study notes", () => {
    const owned = demoReducer(signedIn(), { listingId: "notes-itpr101", type: "buyNotes" });
    renderWithProviders(<MyNotesScreen />, owned);
    fireEvent.press(screen.getByTestId("notes-row-notes-itpr101"));
    expect(mockPush).toHaveBeenCalledWith("/account/notes-read/notes-itpr101");
  });
});
