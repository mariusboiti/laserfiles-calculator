import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LaserMachinesService } from '../laser-machines/laser-machines.service';
import { MarketplaceService } from '../marketplace/marketplace.service';

/**
 * LaserBusinessPipelineService — Central orchestrator
 * Photo → Product → Production → Marketplace
 *
 * Coordinates the end-to-end flow from a generated AI product
 * to a laser job and marketplace listing.
 */
@Injectable()
export class LaserPipelineService {
  constructor(
    private prisma: PrismaService,
    private machines: LaserMachinesService,
    private marketplace: MarketplaceService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: PRODUCT → LASER JOB
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a laser job directly from a Photo Product AI result.
   * Called when user clicks "Send to Laser" in the Studio.
   */
  async createJobFromProduct(data: {
    userId: string;
    machineId: string;
    // From Photo Product AI result
    productType: string;
    materialLabel: string;
    thicknessMm?: number;
    cutSvgUrl?: string;
    engraveSvgUrl?: string;
    scoreSvgUrl?: string;
    combinedSvgUrl?: string;
    jobWidthMm?: number;
    jobHeightMm?: number;
    estimatedTimeSec?: number;
    speedMmS?: number;
    powerPct?: number;
    passes?: number;
    kerfMm?: number;
    sourceArtifactId?: string;
    // Production info from AI pipeline
    productionInfo?: any;
  }) {
    // Validate machine exists and is available
    const machine = await this.machines.getMachine(data.machineId);
    if (machine.connectionStatus === 'ERROR') {
      throw new BadRequestException('Machine is in error state. Fix connection before sending jobs.');
    }

    // Build job name from product info
    const jobName = `${this.formatProductType(data.productType)} — ${data.materialLabel}`;

    // Create the job with full production metadata
    const job = await this.machines.createJob({
      machineId: data.machineId,
      userId: data.userId,
      jobName,
      productType: data.productType,
      materialLabel: data.materialLabel,
      thicknessMm: data.thicknessMm,
      cutSvgUrl: data.cutSvgUrl,
      engraveSvgUrl: data.engraveSvgUrl,
      scoreSvgUrl: data.scoreSvgUrl,
      combinedSvgUrl: data.combinedSvgUrl,
      speedMmS: data.speedMmS,
      powerPct: data.powerPct,
      passes: data.passes,
      kerfMm: data.kerfMm,
      jobWidthMm: data.jobWidthMm,
      jobHeightMm: data.jobHeightMm,
      estimatedTimeSec: data.estimatedTimeSec,
      sourceArtifactId: data.sourceArtifactId,
    });

    return {
      job,
      safetyWarnings: job.safetyWarningsJson || [],
      readyToSend: job.safetyValidated,
      nextAction: job.safetyValidated
        ? 'Call POST /laser-machines/jobs/{id}/send to start cutting'
        : 'Review safety warnings before sending',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: PRODUCT → MARKETPLACE LISTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create a marketplace listing from a Photo Product AI result.
   * Called when user clicks "Publish Product" in the Studio.
   */
  async createListingFromProduct(data: {
    userId: string;
    platform: string;
    connectionId?: string;
    // From Photo Product AI result
    productType: string;
    materialLabel: string;
    sizeMm: string;
    subjectLabel?: string;
    subjectType?: string;
    costOfGoods?: number;
    mockupUrls?: string[];
    previewPngUrl?: string;
    sourceArtifactId?: string;
    productionInfoJson?: any;
  }) {
    // Generate AI listing content
    const content = await this.marketplace.generateListingContent({
      productType: data.productType,
      materialLabel: data.materialLabel,
      sizeMm: data.sizeMm,
      subjectLabel: data.subjectLabel,
      subjectType: data.subjectType,
      costOfGoods: data.costOfGoods,
    });

    // Create the listing as a draft
    const listing = await this.marketplace.createListing({
      userId: data.userId,
      platform: data.platform,
      connectionId: data.connectionId,
      title: content.title,
      description: content.description,
      tags: content.tags,
      category: content.category,
      productType: data.productType,
      materialLabel: data.materialLabel,
      sizeMm: data.sizeMm,
      price: content.suggestedPrice,
      costOfGoods: content.costOfGoods,
      sku: content.sku,
      mockupUrls: data.mockupUrls,
      previewPngUrl: data.previewPngUrl,
      seoKeywords: content.seoKeywords,
      sourceArtifactId: data.sourceArtifactId,
      productionInfoJson: data.productionInfoJson,
    });

    return {
      listing,
      generatedContent: content,
      nextAction: 'Review listing details, then call POST /marketplace/listings/{id}/publish',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PIPELINE: FULL FLOW — PRODUCT → JOB + LISTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Execute the full pipeline: create both a laser job and marketplace listing
   * from a single Photo Product AI result.
   */
  async executeFullPipeline(data: {
    userId: string;
    // Machine target
    machineId: string;
    // Marketplace target
    platform: string;
    connectionId?: string;
    // Product data (from Photo Product AI)
    productType: string;
    materialLabel: string;
    thicknessMm?: number;
    sizeMm: string;
    subjectLabel?: string;
    subjectType?: string;
    cutSvgUrl?: string;
    engraveSvgUrl?: string;
    scoreSvgUrl?: string;
    combinedSvgUrl?: string;
    jobWidthMm?: number;
    jobHeightMm?: number;
    estimatedTimeSec?: number;
    speedMmS?: number;
    powerPct?: number;
    passes?: number;
    kerfMm?: number;
    costOfGoods?: number;
    mockupUrls?: string[];
    previewPngUrl?: string;
    sourceArtifactId?: string;
    productionInfoJson?: any;
  }) {
    const steps: string[] = [];

    // Step 1: Create laser job
    let jobResult: any = null;
    try {
      jobResult = await this.createJobFromProduct({
        userId: data.userId,
        machineId: data.machineId,
        productType: data.productType,
        materialLabel: data.materialLabel,
        thicknessMm: data.thicknessMm,
        cutSvgUrl: data.cutSvgUrl,
        engraveSvgUrl: data.engraveSvgUrl,
        scoreSvgUrl: data.scoreSvgUrl,
        combinedSvgUrl: data.combinedSvgUrl,
        jobWidthMm: data.jobWidthMm,
        jobHeightMm: data.jobHeightMm,
        estimatedTimeSec: data.estimatedTimeSec,
        speedMmS: data.speedMmS,
        powerPct: data.powerPct,
        passes: data.passes,
        kerfMm: data.kerfMm,
        sourceArtifactId: data.sourceArtifactId,
        productionInfo: data.productionInfoJson,
      });
      steps.push('laser-job-created');
    } catch (err) {
      steps.push('laser-job-failed');
    }

    // Step 2: Create marketplace listing
    let listingResult: any = null;
    try {
      listingResult = await this.createListingFromProduct({
        userId: data.userId,
        platform: data.platform,
        connectionId: data.connectionId,
        productType: data.productType,
        materialLabel: data.materialLabel,
        sizeMm: data.sizeMm,
        subjectLabel: data.subjectLabel,
        subjectType: data.subjectType,
        costOfGoods: data.costOfGoods,
        mockupUrls: data.mockupUrls,
        previewPngUrl: data.previewPngUrl,
        sourceArtifactId: data.sourceArtifactId,
        productionInfoJson: data.productionInfoJson,
      });
      steps.push('listing-created');
    } catch (err) {
      steps.push('listing-failed');
    }

    return {
      pipelineStatus: steps.includes('laser-job-failed') || steps.includes('listing-failed') ? 'partial' : 'complete',
      completedSteps: steps,
      laserJob: jobResult,
      marketplaceListing: listingResult,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // BATCH PIPELINE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create multiple laser jobs from a batch of products.
   * Links to an existing ProductionBatch.
   */
  async createBatchJobs(data: {
    userId: string;
    machineId: string;
    productionBatchId?: string;
    products: Array<{
      productType: string;
      materialLabel: string;
      cutSvgUrl?: string;
      engraveSvgUrl?: string;
      combinedSvgUrl?: string;
      jobWidthMm?: number;
      jobHeightMm?: number;
      estimatedTimeSec?: number;
      speedMmS?: number;
      powerPct?: number;
    }>;
  }) {
    const jobs = [];
    for (const product of data.products) {
      try {
        const job = await this.machines.createJob({
          machineId: data.machineId,
          userId: data.userId,
          jobName: `Batch: ${this.formatProductType(product.productType)} — ${product.materialLabel}`,
          productType: product.productType,
          materialLabel: product.materialLabel,
          cutSvgUrl: product.cutSvgUrl,
          engraveSvgUrl: product.engraveSvgUrl,
          combinedSvgUrl: product.combinedSvgUrl,
          jobWidthMm: product.jobWidthMm,
          jobHeightMm: product.jobHeightMm,
          estimatedTimeSec: product.estimatedTimeSec,
          speedMmS: product.speedMmS,
          powerPct: product.powerPct,
          productionBatchId: data.productionBatchId,
        });
        jobs.push({ status: 'created', job });
      } catch (err) {
        jobs.push({ status: 'failed', error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    return {
      totalRequested: data.products.length,
      created: jobs.filter(j => j.status === 'created').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      jobs,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private formatProductType(pt: string): string {
    return pt.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}
