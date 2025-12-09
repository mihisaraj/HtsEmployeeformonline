import mongoose from "mongoose";

const NomineeSchema = new mongoose.Schema({
    name: String,
    passportId: String,
    relationship: String,
    portion: String,
});

const EmployeeSchema = new mongoose.Schema(
    {
        // Profile
        profileName: String,
        profileEmail: String,

        // Form Fields
        passportName: String,
        callingName: String,
        gender: String,
        dob: String, // Constructed DOB
        nationality: String,
        religion: String,
        passportNo: {
            type: String,
            unique: true, // Primary Key behavior
            required: true,
        },
        maritalStatus: String,
        contactNumber: String,

        // Addresses
        sriLankaAddress: String,
        homeCountryAddress: String,

        // Contacts
        sriLankaContact: String,
        homeContactCode: String,
        homeContactNumber: String,
        homeCountry: String,
        personalEmail: String,

        // Emergency
        emergencyName: String,
        emergencyRelationship: String,
        emergencyContact: String,
        emergencyAddress: String,

        // Family
        birthPlace: String,
        spouseName: String,
        motherName: String,
        fatherName: String,

        // Nominees
        nominees: [NomineeSchema],

        submittedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

export default mongoose.models.Employee ||
    mongoose.model("Employee", EmployeeSchema);
