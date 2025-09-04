const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Membership = require('../models/Membership');
const UserMembership = require('../models/UserMembership');
const Trainer = require('../models/Trainer');
const Class = require('../models/Class');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/richard_fitness', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const seedData = async () => {
    try {
        console.log('🌱 Starting database seeding...');

        // Clear existing data
        await User.deleteMany({});
        await Membership.deleteMany({});
        await UserMembership.deleteMany({});
        await Trainer.deleteMany({});
        await Class.deleteMany({});

        console.log('🗑️  Cleared existing data');

        // Create membership plans
        const membershipPlans = [
            {
                planName: 'Basic',
                description: 'Perfect for getting started with your fitness journey',
                price: {
                    monthly: 29,
                    yearly: 290
                },
                features: [
                    { name: 'Gym access during staffed hours', included: true },
                    { name: 'All cardio and weight equipment', included: true },
                    { name: 'Locker room access', included: true },
                    { name: 'Free fitness assessment', included: true },
                    { name: 'Group classes', included: false },
                    { name: 'Personal training sessions', included: false },
                    { name: 'Swimming pool access', included: false },
                    { name: 'Guest passes', included: false }
                ],
                limits: {
                    gymAccess: 'staffed_hours',
                    guestPasses: 0,
                    personalTrainingSessions: 0,
                    groupClasses: 'none'
                },
                sortOrder: 1
            },
            {
                planName: 'Premium',
                description: 'Our most popular plan with full access to facilities',
                price: {
                    monthly: 49,
                    yearly: 490
                },
                features: [
                    { name: '24/7 gym access', included: true },
                    { name: 'All equipment and facilities', included: true },
                    { name: 'Unlimited group classes', included: true },
                    { name: 'Swimming pool access', included: true },
                    { name: 'Guest passes (2 per month)', included: true },
                    { name: 'Nutrition consultation', included: true },
                    { name: 'Personal training sessions', included: false },
                    { name: 'Recovery zone access', included: false }
                ],
                limits: {
                    gymAccess: '24_7',
                    guestPasses: 2,
                    personalTrainingSessions: 0,
                    groupClasses: 'unlimited'
                },
                isPopular: true,
                sortOrder: 2
            },
            {
                planName: 'Elite',
                description: 'Premium experience with personal training and exclusive perks',
                price: {
                    monthly: 79,
                    yearly: 790
                },
                features: [
                    { name: 'All Premium benefits', included: true },
                    { name: '4 personal training sessions', included: true },
                    { name: 'Priority class booking', included: true },
                    { name: 'Recovery zone access', included: true },
                    { name: 'Unlimited guest passes', included: true },
                    { name: 'Meal planning support', included: true },
                    { name: 'Exclusive member events', included: true },
                    { name: 'Concierge service', included: true }
                ],
                limits: {
                    gymAccess: '24_7',
                    guestPasses: -1, // unlimited
                    personalTrainingSessions: 4,
                    groupClasses: 'unlimited'
                },
                sortOrder: 3
            }
        ];

        const createdPlans = await Membership.create(membershipPlans);
        console.log('✅ Created membership plans');

        // Create admin user
        const adminUser = await User.create({
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@richardfitness.com',
            password: 'admin123',
            phone: '(555) 123-4567',
            dateOfBirth: new Date('1985-01-01'),
            gender: 'other',
            role: 'admin',
            emergencyContact: {
                name: 'Emergency Contact',
                phone: '(555) 999-9999',
                relationship: 'spouse'
            }
        });

        console.log('✅ Created admin user');

        // Create sample users
        const sampleUsers = [
            {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'password123',
                phone: '(555) 100-0001',
                dateOfBirth: new Date('1990-05-15'),
                gender: 'male',
                role: 'member',
                emergencyContact: {
                    name: 'Jane Doe',
                    phone: '(555) 100-0002',
                    relationship: 'spouse'
                },
                fitnessGoals: ['weight_loss', 'general_fitness'],
                membershipStatus: 'active'
            },
            {
                firstName: 'Sarah',
                lastName: 'Johnson',
                email: 'sarah@example.com',
                password: 'password123',
                phone: '(555) 100-0003',
                dateOfBirth: new Date('1988-08-22'),
                gender: 'female',
                role: 'trainer',
                emergencyContact: {
                    name: 'Mike Johnson',
                    phone: '(555) 100-0004',
                    relationship: 'spouse'
                },
                fitnessGoals: ['strength', 'muscle_gain'],
                membershipStatus: 'active'
            },
            {
                firstName: 'Mike',
                lastName: 'Rodriguez',
                email: 'mike@example.com',
                password: 'password123',
                phone: '(555) 100-0005',
                dateOfBirth: new Date('1985-12-10'),
                gender: 'male',
                role: 'trainer',
                emergencyContact: {
                    name: 'Maria Rodriguez',
                    phone: '(555) 100-0006',
                    relationship: 'spouse'
                },
                fitnessGoals: ['endurance', 'general_fitness'],
                membershipStatus: 'active'
            },
            {
                firstName: 'Emma',
                lastName: 'Davis',
                email: 'emma@example.com',
                password: 'password123',
                phone: '(555) 100-0007',
                dateOfBirth: new Date('1992-03-18'),
                gender: 'female',
                role: 'trainer',
                emergencyContact: {
                    name: 'David Davis',
                    phone: '(555) 100-0008',
                    relationship: 'spouse'
                },
                fitnessGoals: ['flexibility', 'general_fitness'],
                membershipStatus: 'active'
            }
        ];

        const createdUsers = await User.create(sampleUsers);
        console.log('✅ Created sample users');

        // Create trainer profiles
        const trainerUsers = createdUsers.filter(user => user.role === 'trainer');
        
        const trainerProfiles = [
            {
                user: trainerUsers[0]._id, // Sarah Johnson
                specializations: ['strength_training', 'powerlifting'],
                certifications: [
                    {
                        name: 'NASM-CPT',
                        issuingOrganization: 'National Academy of Sports Medicine',
                        issueDate: new Date('2020-01-15'),
                        expiryDate: new Date('2024-01-15'),
                        certificateNumber: 'NASM-12345'
                    }
                ],
                experience: {
                    yearsOfExperience: 8,
                    achievements: ['Powerlifting State Champion 2019', 'Certified Nutrition Specialist']
                },
                bio: 'NASM-CPT with 8 years of experience. Specializes in functional fitness and Olympic lifting. Passionate about helping clients achieve their strength goals.',
                availability: [
                    { day: 'monday', startTime: '06:00', endTime: '14:00' },
                    { day: 'tuesday', startTime: '06:00', endTime: '14:00' },
                    { day: 'wednesday', startTime: '06:00', endTime: '14:00' },
                    { day: 'thursday', startTime: '06:00', endTime: '14:00' },
                    { day: 'friday', startTime: '06:00', endTime: '14:00' }
                ],
                hourlyRate: 75,
                socialMedia: {
                    instagram: '@sarahjohnson_pt',
                    facebook: 'SarahJohnsonFitness'
                },
                rating: { average: 4.8, totalReviews: 24 }
            },
            {
                user: trainerUsers[1]._id, // Mike Rodriguez
                specializations: ['hiit', 'cardio'],
                certifications: [
                    {
                        name: 'ACE-CPT',
                        issuingOrganization: 'American Council on Exercise',
                        issueDate: new Date('2019-06-01'),
                        expiryDate: new Date('2023-06-01'),
                        certificateNumber: 'ACE-67890'
                    }
                ],
                experience: {
                    yearsOfExperience: 6,
                    achievements: ['HIIT Specialist Certification', 'Marathon Finisher x3']
                },
                bio: 'ACE-CPT with 6 years of experience. Expert in high-intensity training and weight loss programs. Motivational coach who pushes clients to their limits.',
                availability: [
                    { day: 'monday', startTime: '15:00', endTime: '21:00' },
                    { day: 'tuesday', startTime: '15:00', endTime: '21:00' },
                    { day: 'wednesday', startTime: '15:00', endTime: '21:00' },
                    { day: 'thursday', startTime: '15:00', endTime: '21:00' },
                    { day: 'friday', startTime: '15:00', endTime: '21:00' }
                ],
                hourlyRate: 65,
                socialMedia: {
                    instagram: '@mike_hiit_trainer',
                    twitter: '@MikeRodriguezPT'
                },
                rating: { average: 4.6, totalReviews: 18 }
            },
            {
                user: trainerUsers[2]._id, // Emma Davis
                specializations: ['yoga', 'pilates'],
                certifications: [
                    {
                        name: 'RYT-500',
                        issuingOrganization: 'Yoga Alliance',
                        issueDate: new Date('2018-03-01'),
                        expiryDate: new Date('2025-03-01'),
                        certificateNumber: 'RYT-11111'
                    }
                ],
                experience: {
                    yearsOfExperience: 10,
                    achievements: ['Advanced Pilates Instructor', 'Meditation Teacher Training']
                },
                bio: 'RYT-500 with 10 years of experience. Certified in various yoga styles and injury rehabilitation. Focuses on mind-body connection and holistic wellness.',
                availability: [
                    { day: 'monday', startTime: '08:00', endTime: '16:00' },
                    { day: 'wednesday', startTime: '08:00', endTime: '16:00' },
                    { day: 'friday', startTime: '08:00', endTime: '16:00' },
                    { day: 'saturday', startTime: '08:00', endTime: '16:00' },
                    { day: 'sunday', startTime: '08:00', endTime: '16:00' }
                ],
                hourlyRate: 70,
                socialMedia: {
                    instagram: '@emma_yoga_flow',
                    linkedin: 'emma-davis-yoga'
                },
                rating: { average: 4.9, totalReviews: 31 }
            }
        ];

        const createdTrainers = await Trainer.create(trainerProfiles);
        console.log('✅ Created trainer profiles');

        // Create sample classes
        const sampleClasses = [
            {
                name: 'HIIT Bootcamp',
                description: 'High-intensity interval training to burn calories and build endurance',
                category: 'cardio',
                instructor: createdTrainers[1]._id, // Mike Rodriguez
                duration: 45,
                maxParticipants: 20,
                difficulty: 'intermediate',
                schedule: [
                    { day: 'monday', startTime: '06:00', endTime: '06:45', room: 'Studio A' },
                    { day: 'wednesday', startTime: '06:00', endTime: '06:45', room: 'Studio A' },
                    { day: 'friday', startTime: '06:00', endTime: '06:45', room: 'Studio A' }
                ],
                price: { dropIn: 25, memberDiscount: 0 },
                membershipRequirement: 'basic',
                tags: ['hiit', 'cardio', 'bootcamp'],
                benefits: ['Burns calories', 'Improves cardiovascular health', 'Builds endurance']
            },
            {
                name: 'Vinyasa Flow Yoga',
                description: 'Dynamic yoga practice linking breath with movement',
                category: 'mind_body',
                instructor: createdTrainers[2]._id, // Emma Davis
                duration: 60,
                maxParticipants: 15,
                difficulty: 'all_levels',
                schedule: [
                    { day: 'tuesday', startTime: '09:00', endTime: '10:00', room: 'Studio B' },
                    { day: 'thursday', startTime: '09:00', endTime: '10:00', room: 'Studio B' },
                    { day: 'saturday', startTime: '09:00', endTime: '10:00', room: 'Studio B' }
                ],
                price: { dropIn: 20, memberDiscount: 10 },
                membershipRequirement: 'none',
                tags: ['yoga', 'flexibility', 'mindfulness'],
                benefits: ['Improves flexibility', 'Reduces stress', 'Builds core strength']
            },
            {
                name: 'Strength Training 101',
                description: 'Learn proper form and technique for weight training',
                category: 'strength',
                instructor: createdTrainers[0]._id, // Sarah Johnson
                duration: 50,
                maxParticipants: 12,
                difficulty: 'beginner',
                schedule: [
                    { day: 'tuesday', startTime: '18:00', endTime: '18:50', room: 'Weight Room' },
                    { day: 'thursday', startTime: '18:00', endTime: '18:50', room: 'Weight Room' }
                ],
                price: { dropIn: 30, memberDiscount: 0 },
                membershipRequirement: 'premium',
                tags: ['strength', 'weights', 'beginner'],
                benefits: ['Builds muscle', 'Improves bone density', 'Increases metabolism']
            }
        ];

        await Class.create(sampleClasses);
        console.log('✅ Created sample classes');

        // Give some users memberships
        const memberUser = createdUsers.find(u => u.email === 'john@example.com');
        if (memberUser) {
            const premiumPlan = createdPlans.find(p => p.planName === 'Premium');
            
            const userMembership = await UserMembership.create({
                user: memberUser._id,
                membership: premiumPlan._id,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                billingCycle: 'monthly',
                paymentInfo: {
                    amount: premiumPlan.price.monthly,
                    paymentMethod: 'card',
                    transactionId: 'txn_sample_123'
                }
            });

            // Update user membership reference
            memberUser.membership = premiumPlan._id;
            await memberUser.save();
        }

        console.log('✅ Created sample membership');

        console.log('🎉 Database seeding completed successfully!');
        console.log('\n📋 Sample credentials:');
        console.log('Admin: admin@richardfitness.com / admin123');
        console.log('Member: john@example.com / password123');
        console.log('Trainer: sarah@example.com / password123');
        
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};

seedData();