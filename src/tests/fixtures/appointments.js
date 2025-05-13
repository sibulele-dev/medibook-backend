exports.appointments = [
  {
    id: "1",
    practiceId: "1",
    doctorId: "1",
    patientId: "1",
    dateTime: new Date("2023-06-15T14:30:00"),
    duration: 30, // minutes
    status: "CONFIRMED",
    reason: "Annual checkup",
    notes: "Patient requested early morning appointment",
    createdAt: new Date("2023-01-10"),
    updatedAt: new Date("2023-01-10"),
  },
  {
    id: "2",
    practiceId: "1",
    doctorId: "2",
    patientId: "1",
    dateTime: new Date("2023-06-20T10:00:00"),
    duration: 45, // minutes
    status: "PENDING",
    reason: "Follow-up consultation",
    notes: "",
    createdAt: new Date("2023-01-15"),
    updatedAt: new Date("2023-01-15"),
  },
];
