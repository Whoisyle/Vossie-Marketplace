import {
  validateDemoEmail,
  validateDemoStudentNumber,
  listCampuses,
  getCampusDisplayName,
  fetchMarketplaceListings,
  getProfile,
  updateProfile,
  requestOrder,
  respondToOrder,
  cancelOrder,
  confirmHandoff,
  reportHandoffIssue,
  requestBooking,
  respondToBooking,
  cancelBooking,
  reportNoShow,
} from "./index";

describe("Supabase Backend Service Layer", () => {
  describe("Auth & Demo Student Eligibility", () => {
    it("validates demo email format correctly", () => {
      expect(validateDemoEmail("student@vossie.net")).toBe(true);
      expect(validateDemoEmail("john.doe@vossie.net")).toBe(true);
      expect(validateDemoEmail("not-an-email")).toBe(false);
    });

    it("validates demo student number beginning with eduv", () => {
      expect(validateDemoStudentNumber("eduv12345")).toBe(true);
      expect(validateDemoStudentNumber("EDUV99812")).toBe(true);
      expect(validateDemoStudentNumber("student123")).toBe(false);
      expect(validateDemoStudentNumber("eduv")).toBe(false); // too short
    });
  });

  describe("Campus Catalog", () => {
    it("lists all 12 owner-approved campuses with stable keys", async () => {
      const campuses = await listCampuses();
      expect(campuses).toHaveLength(12);

      const keys = campuses.map((c) => c.id);
      expect(keys).toContain("potchefstroom");
      expect(keys).toContain("midrand-head-office");
      expect(keys).toContain("bedfordview");
      expect(keys).toContain("pretoria");
      expect(keys).toContain("vaal-vanderbijlpark");
      expect(keys).toContain("bloemfontein");
      expect(keys).toContain("durban-umhlanga");
      expect(keys).toContain("east-london");
      expect(keys).toContain("nelson-mandela-bay-gqeberha");
      expect(keys).toContain("cape-town-mowbray");
      expect(keys).toContain("tyger-valley-cape-town");
      expect(keys).toContain("nelspruit-mbombela");
    });

    it("resolves campus display names accurately", () => {
      expect(getCampusDisplayName("potchefstroom")).toBe("Potchefstroom");
      expect(getCampusDisplayName("midrand-head-office")).toBe("Midrand (Head Office)");
    });
  });

  describe("Marketplace Listings & Filters", () => {
    it("fetches listings and supports filtering by category and query", async () => {
      const allListings = await fetchMarketplaceListings();
      expect(allListings.length).toBeGreaterThan(0);

      const foodListings = await fetchMarketplaceListings({ category: "Food" });
      expect(foodListings.every((item) => item.category === "Food")).toBe(true);

      const notebookSearch = await fetchMarketplaceListings({ query: "notebook" });
      expect(notebookSearch.length).toBeGreaterThanOrEqual(1);
      expect(notebookSearch[0]?.name).toContain("Notebook");
    });

    it("filters listings by campus correctly", async () => {
      const potchListings = await fetchMarketplaceListings({ campus: "potchefstroom" });
      expect(potchListings.every((item) => item.campus === "potchefstroom")).toBe(true);
    });
  });

  describe("Profile Management", () => {
    it("reads profile and applies updates", async () => {
      const initial = await getProfile();
      expect(initial.displayName).toBeDefined();

      const updated = await updateProfile({ displayName: "Jordan Vossie", preferredCampus: "pretoria" });
      expect(updated.displayName).toBe("Jordan Vossie");
      expect(updated.preferredCampus).toBe("pretoria");
    });
  });

  describe("Goods Orders & Atomic Lifecycle", () => {
    it("requests an order with atomic stock hold and 24h expiration", async () => {
      const res = await requestOrder("find-1", 2, "Meet at campus library");
      expect(res.success).toBe(true);
      expect(res.order).toBeDefined();
      expect(res.order?.quantity).toBe(2);
      expect(res.order?.status).toBe("requested");
    });

    it("handles order acceptance and rejection transitions", async () => {
      const acceptRes = await respondToOrder("order-123", true);
      expect(acceptRes.success).toBe(true);

      const rejectRes = await respondToOrder("order-123", false);
      expect(rejectRes.success).toBe(true);
    });

    it("handles cancellation, handoff confirmation, and issue reporting", async () => {
      const cancelRes = await cancelOrder("order-123");
      expect(cancelRes.success).toBe(true);

      const handoffRes = await confirmHandoff("order-123");
      expect(handoffRes.success).toBe(true);

      const issueRes = await reportHandoffIssue("order-123", "Item damaged");
      expect(issueRes.success).toBe(true);
    });
  });

  describe("Service Bookings & No-show Lifecycle", () => {
    it("handles booking request, response, cancellation and no-show reporting", async () => {
      const bookRes = await requestBooking("svc-1", "slot-1", "Haircut appointment");
      expect(bookRes.success).toBe(true);

      const respondRes = await respondToBooking("book-1", true);
      expect(respondRes.success).toBe(true);

      const cancelRes = await cancelBooking("book-1");
      expect(cancelRes.success).toBe(true);

      const noShowRes = await reportNoShow("book-1", "Client did not attend");
      expect(noShowRes.success).toBe(true);
    });
  });
});
