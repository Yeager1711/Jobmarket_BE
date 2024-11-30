import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
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

      @Get('all-jobs')
      async getJAllJobs() {
            try {
                  const jobData = await this.jobService.getJAllJobs();
                  return { success: true, data: jobData };
            } catch (error) {
                  throw new Error(`Error retrieving job details: ${error.message}`);
            }
      }

      @Get('job_skip')
      async getJobsTakeBy(@Query('skip') skip: string, @Query('take') take: string) {
            const parsedSkip = parseInt(skip, 10);
            const parsedTake = parseInt(take, 10);

            if (isNaN(parsedSkip) || isNaN(parsedTake)) {
                  throw new Error(
                        'Invalid "skip" or "take" parameter. Please provide numeric values.'
                  );
            }

            try {
                  const { items, total } = await this.jobService.getJobsTakeBy(
                        parsedSkip,
                        parsedTake
                  );

                  return { success: true, data: items, totalItems: total };
            } catch (error) {
                  throw new Error(`Error retrieving job details: ${error.message}`);
            }
      }

      @Get(':jobId')
      async getJobById(@Param('jobId') jobId: number) {
            try {
                  const job = await this.jobService.getJobById(jobId);
                  return { success: true, data: job };
            } catch (error) {
                  throw new Error(`Error retrieving job details: ${error.message}`);
            }
      }

      @Get('by-tech/:tech')
      async getJobsByTech(@Param('tech') tech: string) {
            try {
                  const jobs = await this.jobService.getJobsByTech(tech);
                  return { success: true, data: jobs };
            } catch (error) {
                  throw new Error(`Error retrieving jobs by tech: ${error.message}`);
            }
      }

      @Get('by-nameCompany/:name')
      async getJobsByNameCompany(@Param('name') name: string) {
            try {
                  const jobs = await this.jobService.getJobsByNameCompany(name);
                  return { success: true, data: jobs };
            } catch (error) {
                  throw new Error(`Error retrieving jobs by name company: ${error.message}`);
            }
      }
}
