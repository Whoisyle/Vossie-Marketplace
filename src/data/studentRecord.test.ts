import { formatStudentNumber, lookupStudentRecord, STUDENT_NUMBER_LENGTH } from "./studentRecord";

describe("mock student record", () => {
  it("gives the same nine-digit number and campus for the same email", () => {
    const first = lookupStudentRecord("eduv230953@vossie.net");
    const again = lookupStudentRecord("  EDUV230953@vossie.net ");
    expect(again).toEqual(first);
    expect(first.studentNumber).toHaveLength(STUDENT_NUMBER_LENGTH);
    expect(first.studentNumber).toMatch(/^\d{9}$/);
    expect(first.campusId).toBe("potchefstroom");
  });

  it("works for an email without digits", () => {
    const record = lookupStudentRecord("someone@vossie.net");
    expect(record.studentNumber).toHaveLength(STUDENT_NUMBER_LENGTH);
  });

  it("groups the number for reading", () => {
    expect(formatStudentNumber("202312345")).toBe("2023 12345");
    expect(formatStudentNumber("12")).toBe("12");
  });
});
