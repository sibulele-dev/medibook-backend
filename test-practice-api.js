const axios = require("axios");

const API_BASE = "http://localhost:3000/api";

// Test data
const testPractice = {
  name: "Test Medical Practice",
  email: "test@practice.com",
  phone: "+27123456789",
  address: "123 Test Street, Johannesburg",
  specialization: "General Practice",
  description: "A test medical practice for API testing",
  status: "active",
  website: "https://testpractice.com",
  operatingHours: "Mon-Fri 8AM-5PM",
};

const testPracticeUpdate = {
  name: "Updated Test Medical Practice",
  phone: "+27123456788",
};

let practiceId;

const testPracticeAPI = async () => {
  try {
    console.log("🧪 Testing Practice API...\n");

    // Test 1: Create Practice
    console.log("1. Testing CREATE practice...");
    const createResponse = await axios.post(
      `${API_BASE}/practices`,
      testPractice
    );
    practiceId = createResponse.data.data.id;
    console.log(
      "✅ Practice created successfully:",
      createResponse.data.message
    );
    console.log("   Practice ID:", practiceId);

    // Test 2: Get All Practices
    console.log("\n2. Testing GET all practices...");
    const getAllResponse = await axios.get(`${API_BASE}/practices`);
    console.log("✅ Retrieved practices successfully");
    console.log(
      "   Total practices:",
      getAllResponse.data.data.practices.length
    );

    // Test 3: Get Practice by ID
    console.log("\n3. Testing GET practice by ID...");
    const getByIdResponse = await axios.get(
      `${API_BASE}/practices/${practiceId}`
    );
    console.log("✅ Retrieved practice by ID successfully");
    console.log("   Practice name:", getByIdResponse.data.data.name);

    // Test 4: Update Practice
    console.log("\n4. Testing UPDATE practice...");
    const updateResponse = await axios.put(
      `${API_BASE}/practices/${practiceId}`,
      testPracticeUpdate
    );
    console.log(
      "✅ Practice updated successfully:",
      updateResponse.data.message
    );

    // Test 5: Get Practice Stats
    console.log("\n5. Testing GET practice stats...");
    const statsResponse = await axios.get(`${API_BASE}/practices/stats`);
    console.log("✅ Retrieved practice stats successfully");
    console.log("   Stats:", statsResponse.data.data);

    // Test 6: Search Practices
    console.log("\n6. Testing SEARCH practices...");
    const searchResponse = await axios.get(`${API_BASE}/practices?search=Test`);
    console.log("✅ Search completed successfully");
    console.log(
      "   Search results:",
      searchResponse.data.data.practices.length
    );

    // Test 7: Delete Practice
    console.log("\n7. Testing DELETE practice...");
    const deleteResponse = await axios.delete(
      `${API_BASE}/practices/${practiceId}`
    );
    console.log(
      "✅ Practice deleted successfully:",
      deleteResponse.data.message
    );

    console.log("\n🎉 All tests passed successfully!");
  } catch (error) {
    console.error(
      "❌ Test failed:",
      error.response?.data?.message || error.message
    );
    if (error.response?.data) {
      console.error("   Response data:", error.response.data);
    }
  }
};

// Note: This test requires admin authentication
// You'll need to either:
// 1. Temporarily remove auth middleware for testing
// 2. Get a valid admin token and include it in headers
// 3. Test through the frontend with proper authentication

console.log("⚠️  Note: This test requires admin authentication.");
console.log("   To run this test, you need to either:");
console.log("   1. Temporarily remove auth middleware");
console.log("   2. Get a valid admin token");
console.log("   3. Test through the frontend\n");

// Uncomment the line below to run the test (after setting up authentication)
// testPracticeAPI();
