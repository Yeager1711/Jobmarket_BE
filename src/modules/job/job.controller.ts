import { Controller, Post, Get, Param, Body } from '@nestjs/common'; // Added imports for Get and Param
import { JobService } from './job.service';
import { Job } from '../../entities/job.entity';
import { AppService } from 'src/app.service';

@Controller('jobs')
export class JobController {
      constructor(private readonly jobService: JobService) {}

      @Post()
      async createJob(@Body() job: Job) {
            console.log('Data', job);
            const savedJob = await this.jobService.saveJobData(job); 
            return { success: true, message: 'Job created successfully', data: savedJob };
      }

      @Get("all-jobs")
      async getJAllJobs() {
            try {
                  const jobData = await this.jobService.getJAllJobs();
                  return { success: true, data: jobData };
            } catch (error) {
                  throw new Error(`Error retrieving job details: ${error.message}`);
            }
      }
}
