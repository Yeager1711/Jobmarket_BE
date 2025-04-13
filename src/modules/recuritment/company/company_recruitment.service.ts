import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recruitment } from '../../../entities/recruitment.entity';

@Injectable()
export class Recruitment_Company_Service {
        constructor(
                @InjectRepository(Recruitment)
                private recruitmentRepository: Repository<Recruitment>
        ) {}

        async getRecruitmentById(recruitmentId: number): Promise<Recruitment> {
                const recruitment = await this.recruitmentRepository.findOne({
                        where: { recruitment_Id: recruitmentId },
                        relations: ['company'],
                });
                if (!recruitment) {
                        throw new NotFoundException('Recruitment not found');
                }
                return recruitment;
        }
}



// import { Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Recruitment } from '../../../entities/recruitment.entity';

// @Injectable()
// export class Recruitment_Company_Service {
//     constructor(
//         @InjectRepository(Recruitment)
//         private recruitmentRepository: Repository<Recruitment>
//     ) {}

//     async getRecruitmentById(recruitmentId: number): Promise<Recruitment> {
//         const recruitment = await this.recruitmentRepository.findOne({
//             where: { recruitment_Id: recruitmentId },
//             relations: ['company', 'company.jobs', 'company.jobs.jobIndustry'],
//             select: {
//                 recruitment_Id: true,
//                 email_hr: true,
//                 firstName: true,
//                 lastName: true,
//                 avatar_hr: true,
//                 gender: true,
//                 company: {
//                     companyId: true,
//                     name: true,
//                     created_at: true,
//                     updated_at: true,
//                     phoneNumber_company: true,
//                     jobs: {
//                         jobId: true,
//                         title: true,
//                         jobIndustry: {
//                             jobIndustryId: true,
//                             name: true,
//                         },
//                     },
//                 },
//             },
//         });

//         if (!recruitment) {
//             throw new NotFoundException('Recruitment not found');
//         }

//         return recruitment;
//     }
// }