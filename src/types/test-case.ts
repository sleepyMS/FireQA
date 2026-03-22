export interface TestCase {
  tcId: string;
  name: string;
  depth1: string;
  depth2: string;
  depth3: string;
  precondition: string;
  procedure: string;
  expectedResult: string;
}

export interface TestSheet {
  sheetName: string;
  category?: string;
  testCases: TestCase[];
}

export interface TestCaseGenerationResult {
  sheets: TestSheet[];
}
