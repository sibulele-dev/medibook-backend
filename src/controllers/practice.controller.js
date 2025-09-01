const practiceService = require("../services/practice.service");

class PracticeController {
  // Check database status
  async checkDatabaseStatus(req, res) {
    try {
      const tableExists = await practiceService.checkTableExists();

      res.status(200).json({
        success: true,
        data: {
          tableExists,
          message: tableExists
            ? "Practices table exists"
            : "Practices table does not exist",
        },
      });
    } catch (error) {
      console.error("Database status check error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to check database status",
      });
    }
  }

  // Get all practices
  async getAllPractices(req, res) {
    try {
      const filters = req.query;

      const result = await practiceService.getAllPractices(filters);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get all practices error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Get practice by ID
  async getPractice(req, res) {
    try {
      const { id } = req.params;

      const practice = await practiceService.getPracticeById(id);

      if (!practice) {
        return res.status(404).json({
          success: false,
          message: "Practice not found",
        });
      }

      res.status(200).json({
        success: true,
        data: practice,
      });
    } catch (error) {
      console.error("Get practice error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Create new practice
  async createPractice(req, res) {
    try {
      const practiceData = req.body;

      const newPractice = await practiceService.createPractice(practiceData);

      res.status(201).json({
        success: true,
        message: "Practice created successfully",
        data: newPractice,
      });
    } catch (error) {
      console.error("Create practice error:", error);

      if (error.message && error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Update practice
  async updatePractice(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updatedPractice = await practiceService.updatePractice(
        id,
        updateData
      );

      if (!updatedPractice) {
        return res.status(404).json({
          success: false,
          message: "Practice not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Practice updated successfully",
        data: updatedPractice,
      });
    } catch (error) {
      console.error("Update practice error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Delete practice
  async deletePractice(req, res) {
    try {
      const { id } = req.params;

      const result = await practiceService.deletePractice(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: "Practice not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Practice deleted successfully",
        data: result,
      });
    } catch (error) {
      console.error("Delete practice error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // Get practice statistics
  async getPracticeStats(req, res) {
    try {
      const stats = await practiceService.getPracticeStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get practice stats error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
}

module.exports = new PracticeController();
