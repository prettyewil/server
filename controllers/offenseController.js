const Offense = require('../models/Offense');

const DEFAULT_OFFENSES = [
    { level: 'Level 1', offense: 'Littering', points: 1 },
    { level: 'Level 1', offense: 'Vandalism', points: 2 },
    { level: 'Level 1', offense: 'Improper spitting', points: 2 },
    { level: 'Level 1', offense: 'Making boisterous noise', points: 3 },
    { level: 'Level 1', offense: 'Uniform violation', points: 1 },
    { level: 'Level 1', offense: 'Failure to register in the Logbook/Attendance', points: 5 },
    { level: 'Level 1', offense: 'Leaving personal belongings in shared spaces', points: 3 },
    { level: 'Level 1', offense: 'Improper garbage segregation and disposal', points: 3 },
    { level: 'Level 1', offense: 'Topless and improper clothes outside the sleeping quarter', points: 2 },
    { level: 'Level 1', offense: 'Sleeping in dorm rooms earlier than stipulated', points: 2 },
    { level: 'Level 1', offense: 'Displaying disorderly conduct (e.g. bullying, oral defamation, public display of affection)', points: 2 },
    { level: 'Level 1', offense: 'Failure to turn off lights, electric fan, and electrical appliances', points: 3 },
    { level: 'Level 1', offense: 'Not attending meetings and activities called by the Dorm Manager', points: 3 },
    { level: 'Level 2', offense: 'Gambling', points: 8 },
    { level: 'Level 2', offense: 'Immoral Acts', points: 5 },
    { level: 'Level 2', offense: 'Insubordination', points: 5 },
    { level: 'Level 2', offense: 'Dishonesty in any form', points: 5 },
    { level: 'Level 2', offense: 'Non-compliance with sleeping arrangement', points: 5 },
    { level: 'Level 2', offense: 'Violation of curfew, study and visiting hours', points: 5 },
    { level: 'Level 2', offense: 'Sleeping overnight outside the dorm without permission', points: 5 },
    { level: 'Level 2', offense: 'Spreading rumors that damage the reputation of other occupants', points: 5 },
    { level: 'Level 2', offense: "No resident's Leave Pass when going out of the dormitory or when coming home late", points: 5 },
    { level: 'Level 2', offense: 'Disrespect towards dormitory staff or other residents', points: 8 },
    { level: 'Level 2', offense: 'Allowing outsiders to enter restricted areas for guests', points: 8 },
    { level: 'Level 3', offense: 'Drinking/consumption of intoxicating beverages within dormitory premises', points: 15 },
    { level: 'Level 3', offense: 'Drugs: possession, use, or sale of marijuana, narcotics, and hallucinogens', points: 15 },
    { level: 'Level 3', offense: 'Smoking (including electronic) within dormitory premises', points: 15 },
    { level: 'Level 3', offense: 'Stealing or attempting to steal money and other property', points: 15 },
    { level: 'Level 3', offense: 'Vandalism to glass panes, walls, and dormitory properties', points: 15 },
    { level: 'Level 3', offense: 'Immoral/Indecent behavior including possession of obscene literature, pornographic materials', points: 15 },
    { level: 'Level 3', offense: 'Misbehavior such as fighting, physical assaulting, intimidating other residents', points: 15 },
    { level: 'Level 3', offense: 'Cooking inside the room', points: 15 },
    { level: 'Level 3', offense: 'Unauthorized use of electrical appliances', points: 15 },
    { level: 'Level 3', offense: 'Repeated/habitual violation of dormitory policies', points: 15 },
];

exports.getOffenses = async (req, res) => {
    try {
        let offenses = await Offense.find().sort({ level: 1, offense: 1 });
        
        // Seed if empty
        if (offenses.length === 0) {
            await Offense.insertMany(DEFAULT_OFFENSES);
            offenses = await Offense.find().sort({ level: 1, offense: 1 });
        }
        
        res.status(200).json(offenses);
    } catch (error) {
        console.error('Error fetching offenses:', error);
        res.status(500).json({ message: 'Error fetching offenses', error: error.message });
    }
};

exports.createOffense = async (req, res) => {
    try {
        const { level, offense, points } = req.body;
        
        if (!level || !offense || points === undefined) {
            return res.status(400).json({ message: 'Level, offense name, and points are required' });
        }

        const existing = await Offense.findOne({ offense: { $regex: new RegExp('^' + offense + '$', 'i') } });
        if (existing) {
            return res.status(400).json({ message: 'This offense already exists.' });
        }

        const newOffense = new Offense({ level, offense, points });
        await newOffense.save();
        
        res.status(201).json({ message: 'Offense created successfully', offense: newOffense });
    } catch (error) {
        console.error('Error creating offense:', error);
        res.status(500).json({ message: 'Error creating offense', error: error.message });
    }
};

exports.deleteOffense = async (req, res) => {
    try {
        const { id } = req.params;
        const offense = await Offense.findById(id);
        if (!offense) {
            return res.status(404).json({ message: 'Offense not found.' });
        }
        await Offense.findByIdAndDelete(id);
        res.status(200).json({ message: 'Offense deleted successfully.' });
    } catch (error) {
        console.error('Error deleting offense:', error);
        res.status(500).json({ message: 'Error deleting offense.', error: error.message });
    }
};
