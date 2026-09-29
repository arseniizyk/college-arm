const {Specialty} = require('../models/models')
const ApiError = require('../error/ApiError')

class SpecialtyController {
    async create(req, res, next){
        try {
            const {name, qualification, duration_years, duration_months} = req.body
            
            if (!name || !qualification || duration_years === undefined) {
                return next(ApiError.badRequest('Не все обязательные поля заполнены'));
            }
            
            const specialty = await Specialty.create({
                name, 
                qualification,
                duration_years: duration_years || 4,
                duration_months: duration_months || 0
            })
            return res.json(specialty)
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { name, qualification, duration_years, duration_months } = req.body;
            
            if (!id) {
                return next(ApiError.badRequest('Не указан ID специальности'));
            }
            
            const specialty = await Specialty.findByPk(id);
            if (!specialty) {
                return next(ApiError.badRequest('Специальность не найдена'));
            }
            
            const updateData = {};
            if (name) updateData.name = name;
            if (qualification) updateData.qualification = qualification;
            if (duration_years !== undefined) updateData.duration_years = duration_years;
            if (duration_months !== undefined) updateData.duration_months = duration_months;
            
            await specialty.update(updateData);
            
            res.json(specialty);
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }

    async get(req, res){
        const specialties = await Specialty.findAll()
        return res.json(specialties)
    }

    async delete(req, res, next){
        try {
            const { id } = req.params; 
            if (!id) {
                return next(ApiError.badRequest('Не указан ID специальности'));
            }
            const spec = await Specialty.findByPk(id);
            if (!spec) {
                return next(ApiError.badRequest('Специальность не найдена'));
            }
            await spec.destroy();
            return res.json({
                message: 'Specialty deleted successfully',
                deletedSpecialty: spec
            });
        } catch (error) {
            next(ApiError.internalRequest(error.message));
        }
    }
}

module.exports = new SpecialtyController() 