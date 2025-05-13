/**
 * Prisma Seed File for Medical Booking Application
 *
 * This script populates the database with initial data for development and testing.
 * It creates sample practices, users (admin, doctors, staff, patients), services,
 * schedules, and appointments.
 *
 * Usage: npx prisma db seed
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const prisma = new PrismaClient();

// Password hashing function
async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

// Main seeding function
async function main() {
  console.log("Starting database seeding...");

  // Delete existing data
  console.log("Cleaning existing data...");
  await cleanDatabase();

  // Create a super admin
  console.log("Creating super admin...");
  const superAdminUser = await createSuperAdmin();

  // Create practices
  console.log("Creating practices...");
  const practice1 = await createPractice("City Health Clinic");
  const practice2 = await createPractice("Family Medical Center");

  // Associate super admin with practices
  await prisma.admin.update({
    where: { id: superAdminUser.admin.id },
    data: {
      practices: {
        connect: [{ id: practice1.id }, { id: practice2.id }],
      },
    },
  });

  // Create practice admin for each practice
  console.log("Creating practice admins...");
  await createPracticeAdmin(practice1);
  await createPracticeAdmin(practice2);

  // Create doctors for each practice
  console.log("Creating doctors...");
  const practice1Doctors = await createDoctors(practice1);
  const practice2Doctors = await createDoctors(practice2);

  // Create services for each practice
  console.log("Creating services...");
  const practice1Services = await createServices(practice1);
  const practice2Services = await createServices(practice2);

  // Associate doctors with services
  console.log("Associating doctors with services...");
  await associateDoctorsWithServices(practice1Doctors, practice1Services);
  await associateDoctorsWithServices(practice2Doctors, practice2Services);

  // Create staff for each practice
  console.log("Creating staff members...");
  await createStaff(practice1);
  await createStaff(practice2);

  // Create patients
  console.log("Creating patients...");
  const patients = await createPatients();

  // Associate patients with practices
  console.log("Associating patients with practices...");
  await associatePatientsWithPractices(patients, [practice1, practice2]);

  // Create schedules for doctors
  console.log("Creating doctor schedules...");
  await createSchedules(practice1Doctors);
  await createSchedules(practice2Doctors);

  // Create appointments
  console.log("Creating sample appointments...");
  await createAppointments(
    practice1,
    practice1Doctors,
    practice1Services,
    patients
  );
  await createAppointments(
    practice2,
    practice2Doctors,
    practice2Services,
    patients
  );

  console.log("Database seeding completed successfully!");
}

// Clean database before seeding
async function cleanDatabase() {
  // Delete in correct order to respect foreign key constraints
  await prisma.timeOff.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.appointment.deleteMany({});
  await prisma.schedule.deleteMany({});
  await prisma.patient.update({
    where: { id: { not: "" } },
    data: { practices: { set: [] } },
  });
  await prisma.service.update({
    where: { id: { not: "" } },
    data: { doctors: { set: [] } },
  });
  await prisma.admin.update({
    where: { id: { not: "" } },
    data: { practices: { set: [] } },
  });
  await prisma.doctor.deleteMany({});
  await prisma.staff.deleteMany({});
  await prisma.patient.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.practice.deleteMany({});
  await prisma.user.deleteMany({});
}

// Create a super admin
async function createSuperAdmin() {
  const hashedPassword = await hashPassword("Admin@123");

  const user = await prisma.user.create({
    data: {
      email: "superadmin@medicalbooking.com",
      password: hashedPassword,
      firstName: "Super",
      lastName: "Admin",
      phone: "555-123-4567",
      role: "SUPER_ADMIN",
      admin: {
        create: {
          isSuperAdmin: true,
        },
      },
    },
    include: {
      admin: true,
    },
  });

  return user;
}

// Create a practice
async function createPractice(name) {
  return await prisma.practice.create({
    data: {
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      email: `info@${name.toLowerCase().replace(/\s+/g, "")}.com`,
      phone: `555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      address: `${Math.floor(100 + Math.random() * 900)} Main Street`,
      city: "Springfield",
      state: "IL",
      zip: `${Math.floor(10000 + Math.random() * 90000)}`,
      website: `https://www.${name.toLowerCase().replace(/\s+/g, "")}.com`,
      logo: `/uploads/practices/${name
        .toLowerCase()
        .replace(/\s+/g, "-")}/logo.svg`,
      primaryColor: "#0070f3",
      secondaryColor: "#f5f5f5",
      description: `${name} is a state-of-the-art medical facility providing comprehensive healthcare services.`,
    },
  });
}

// Create practice admin
async function createPracticeAdmin(practice) {
  const hashedPassword = await hashPassword("Practice@123");

  const user = await prisma.user.create({
    data: {
      email: `admin@${practice.slug}.com`,
      password: hashedPassword,
      firstName: "Practice",
      lastName: "Admin",
      phone: `555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      role: "ADMIN",
      admin: {
        create: {
          isSuperAdmin: false,
          practices: {
            connect: { id: practice.id },
          },
        },
      },
    },
  });

  return user;
}

// Create doctors for a practice
async function createDoctors(practice) {
  const specialties = [
    "General Medicine",
    "Pediatrics",
    "Cardiology",
    "Dermatology",
    "Orthopedics",
  ];

  const doctors = [];

  for (let i = 0; i < 5; i++) {
    const hashedPassword = await hashPassword("Doctor@123");
    const specialty = specialties[i % specialties.length];

    const user = await prisma.user.create({
      data: {
        email: `doctor${i + 1}@${practice.slug}.com`,
        password: hashedPassword,
        firstName: `Doctor${i + 1}`,
        lastName: `${specialty.split(" ")[0]}`,
        phone: `555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(
          1000 + Math.random() * 9000
        )}`,
        role: "DOCTOR",
        doctor: {
          create: {
            practiceId: practice.id,
            title: "Dr.",
            specialty,
            bio: `Experienced ${specialty} specialist with over ${
              5 + i
            } years of clinical experience.`,
            education: `M.D. from University Medical School, Residency at ${practice.name}`,
            profileImage: `/uploads/doctors/${practice.slug}-doctor${
              i + 1
            }.jpg`,
            active: true,
          },
        },
      },
      include: {
        doctor: true,
      },
    });

    doctors.push(user.doctor);
  }

  return doctors;
}

// Create services for a practice
async function createServices(practice) {
  const serviceData = [
    {
      name: "Regular Checkup",
      description: "Comprehensive health assessment and examination",
      duration: 30,
      price: 75.0,
      color: "#4CAF50",
    },
    {
      name: "Specialist Consultation",
      description: "In-depth consultation with a specialist",
      duration: 45,
      price: 120.0,
      color: "#2196F3",
    },
    {
      name: "Follow-up Appointment",
      description: "Follow-up on previous treatment or consultation",
      duration: 20,
      price: 50.0,
      color: "#9C27B0",
    },
    {
      name: "Urgent Care",
      description: "Immediate care for non-emergency medical issues",
      duration: 40,
      price: 100.0,
      color: "#F44336",
    },
    {
      name: "Preventive Care",
      description: "Preventive health services including vaccinations",
      duration: 25,
      price: 65.0,
      color: "#FF9800",
    },
  ];

  const services = [];

  for (const service of serviceData) {
    const createdService = await prisma.service.create({
      data: {
        practiceId: practice.id,
        ...service,
      },
    });

    services.push(createdService);
  }

  return services;
}

// Associate doctors with services
async function associateDoctorsWithServices(doctors, services) {
  for (const doctor of doctors) {
    // Each doctor can provide some services based on their specialty
    const doctorServices = services.slice(0, 3 + Math.floor(Math.random() * 3));

    for (const service of doctorServices) {
      await prisma.service.update({
        where: { id: service.id },
        data: {
          doctors: {
            connect: { id: doctor.id },
          },
        },
      });
    }
  }
}

// Create staff members for a practice
async function createStaff(practice) {
  const positions = [
    "Receptionist",
    "Office Manager",
    "Medical Assistant",
    "Nurse",
    "Admin Assistant",
  ];

  for (let i = 0; i < 3; i++) {
    const hashedPassword = await hashPassword("Staff@123");
    const position = positions[i % positions.length];

    await prisma.user.create({
      data: {
        email: `staff${i + 1}@${practice.slug}.com`,
        password: hashedPassword,
        firstName: `Staff${i + 1}`,
        lastName: `${position.split(" ")[0]}`,
        phone: `555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(
          1000 + Math.random() * 9000
        )}`,
        role: "STAFF",
        staff: {
          create: {
            practiceId: practice.id,
            position,
            active: true,
          },
        },
      },
    });
  }
}

// Create patients
async function createPatients() {
  const patients = [];

  for (let i = 0; i < 20; i++) {
    const hashedPassword = await hashPassword("Patient@123");

    const user = await prisma.user.create({
      data: {
        email: `patient${i + 1}@example.com`,
        password: hashedPassword,
        firstName: `Patient${i + 1}`,
        lastName: `Smith${i + 1}`,
        phone: `555-${Math.floor(100 + Math.random() * 900)}-${Math.floor(
          1000 + Math.random() * 9000
        )}`,
        role: "PATIENT",
        patient: {
          create: {
            dateOfBirth: new Date(
              1980 + Math.floor(Math.random() * 30),
              Math.floor(Math.random() * 12),
              Math.floor(1 + Math.random() * 28)
            ),
            gender: Math.random() > 0.5 ? "Male" : "Female",
            address: `${Math.floor(100 + Math.random() * 900)} Oak Street`,
            city: "Springfield",
            state: "IL",
            zip: `${Math.floor(10000 + Math.random() * 90000)}`,
            insuranceProvider: [
              "Blue Cross",
              "Aetna",
              "UnitedHealth",
              "Cigna",
              "Humana",
            ][Math.floor(Math.random() * 5)],
            insuranceNumber: `INS-${Math.floor(
              10000000 + Math.random() * 90000000
            )}`,
            emergencyContact: `EmergencyContact${i + 1}`,
            emergencyPhone: `555-${Math.floor(
              100 + Math.random() * 900
            )}-${Math.floor(1000 + Math.random() * 9000)}`,
          },
        },
      },
      include: {
        patient: true,
      },
    });

    patients.push(user.patient);
  }

  return patients;
}

// Associate patients with practices
async function associatePatientsWithPractices(patients, practices) {
  for (const patient of patients) {
    // Randomly assign patients to one or both practices
    const practicesToConnect =
      Math.random() > 0.3
        ? practices
        : [practices[Math.floor(Math.random() * practices.length)]];

    for (const practice of practicesToConnect) {
      await prisma.patient.update({
        where: { id: patient.id },
        data: {
          practices: {
            connect: { id: practice.id },
          },
        },
      });
    }
  }
}

// Create schedules for doctors
async function createSchedules(doctors) {
  for (const doctor of doctors) {
    // Create schedule for each day of the week (0 = Sunday, 6 = Saturday)
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      // No working hours on weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        await prisma.schedule.create({
          data: {
            practiceId: doctor.practiceId,
            doctorId: doctor.id,
            dayOfWeek,
            startTime: "09:00",
            endTime: "17:00",
            isAvailable: false,
          },
        });
        continue;
      }

      // Regular working hours on weekdays
      const schedule = await prisma.schedule.create({
        data: {
          practiceId: doctor.practiceId,
          doctorId: doctor.id,
          dayOfWeek,
          startTime: "09:00",
          endTime: "17:00",
          isAvailable: true,
        },
      });

      // Add a lunch break (time off) for each doctor's schedule
      await prisma.timeOff.create({
        data: {
          scheduleId: schedule.id,
          startDate: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate() + ((dayOfWeek - new Date().getDay() + 7) % 7),
            12
          ),
          endDate: new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            new Date().getDate() + ((dayOfWeek - new Date().getDay() + 7) % 7),
            13
          ),
          reason: "Lunch Break",
        },
      });
    }
  }
}

// Create appointments
async function createAppointments(practice, doctors, services, patients) {
  // Get today's date
  const today = new Date();

  // Create appointments for the next 14 days
  for (let day = 0; day < 14; day++) {
    const appointmentDate = new Date(today);
    appointmentDate.setDate(today.getDate() + day);

    // Skip weekends
    if (appointmentDate.getDay() === 0 || appointmentDate.getDay() === 6) {
      continue;
    }

    // Create 2-5 appointments per day
    const appointmentsPerDay = 2 + Math.floor(Math.random() * 4);

    for (let i = 0; i < appointmentsPerDay; i++) {
      // Random doctor, service, and patient
      const doctor = doctors[Math.floor(Math.random() * doctors.length)];
      const service = services[Math.floor(Math.random() * services.length)];
      const patient = patients[Math.floor(Math.random() * patients.length)];

      // Random start time between 9am and 4pm
      const startHour = 9 + Math.floor(Math.random() * 7);
      const startMinute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];

      const startTime = new Date(appointmentDate);
      startTime.setHours(startHour, startMinute, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + service.duration);

      // Random status based on date
      let status;
      if (appointmentDate < today) {
        status =
          Math.random() > 0.2
            ? "COMPLETED"
            : Math.random() > 0.5
            ? "CANCELLED"
            : "NO_SHOW";
      } else if (appointmentDate.toDateString() === today.toDateString()) {
        status = Math.random() > 0.7 ? "CONFIRMED" : "SCHEDULED";
      } else {
        status = "SCHEDULED";
      }

      await prisma.appointment.create({
        data: {
          practiceId: practice.id,
          patientId: patient.id,
          doctorId: doctor.id,
          serviceId: service.id,
          date: new Date(appointmentDate.setHours(0, 0, 0, 0)),
          startTime,
          endTime,
          status,
          notes: status === "COMPLETED" ? "Patient seen and treated." : "",
          cancellationReason:
            status === "CANCELLED" ? "Patient requested cancellation." : null,
          reminder: true,
          reminderSent: appointmentDate <= today,
        },
      });
    }
  }
}

// Run the seed function
main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Close Prisma client connection
    await prisma.$disconnect();
  });
