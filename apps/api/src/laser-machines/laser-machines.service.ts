import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LaserJobStatus, MachineConnectionStatus } from '@prisma/client';

@Injectable()
export class LaserMachinesService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // MACHINE PROFILES CRUD
  // ═══════════════════════════════════════════════════════════════

  async listMachines(userId?: string) {
    return this.prisma.machine.findMany({
      where: userId ? { OR: [{ userId }, { isShared: true }] } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { laserJobs: true } } },
    });
  }

  async getMachine(id: string) {
    const machine = await this.prisma.machine.findUnique({ where: { id } });
    if (!machine) throw new NotFoundException('Machine not found');
    return machine;
  }

  async createMachine(data: {
    name: string;
    userId?: string;
    machineType?: 'DIODE' | 'CO2' | 'FIBER' | 'GALVO';
    connectionType?: 'RUIDA' | 'GRBL' | 'LIGHTBURN_BRIDGE' | 'GLOWFORGE_CLOUD' | 'MANUAL';
    ipAddress?: string;
    port?: number;
    bedWidthMm?: number;
    bedHeightMm?: number;
    maxPowerW?: number;
    maxSpeedMmS?: number;
    accelerationMmS2?: number;
    homePosition?: string;
    hourlyCost?: number;
    materialPresetsJson?: any;
  }) {
    return this.prisma.machine.create({
      data: {
        name: data.name,
        userId: data.userId,
        machineType: data.machineType as any,
        connectionType: data.connectionType as any,
        ipAddress: data.ipAddress,
        port: data.port,
        bedWidthMm: data.bedWidthMm,
        bedHeightMm: data.bedHeightMm,
        maxPowerW: data.maxPowerW,
        maxSpeedMmS: data.maxSpeedMmS,
        accelerationMmS2: data.accelerationMmS2,
        homePosition: data.homePosition,
        hourlyCost: data.hourlyCost,
        materialPresetsJson: data.materialPresetsJson,
      },
    });
  }

  async updateMachine(id: string, data: Partial<{
    name: string;
    machineType: string;
    connectionType: string;
    connectionStatus: string;
    ipAddress: string;
    port: number;
    bedWidthMm: number;
    bedHeightMm: number;
    maxPowerW: number;
    maxSpeedMmS: number;
    accelerationMmS2: number;
    homePosition: string;
    hourlyCost: number;
    materialPresetsJson: any;
    firmwareVersion: string;
    isShared: boolean;
  }>) {
    await this.getMachine(id);
    return this.prisma.machine.update({ where: { id }, data: data as any });
  }

  async deleteMachine(id: string) {
    await this.getMachine(id);
    return this.prisma.machine.delete({ where: { id } });
  }

  async pingMachine(id: string) {
    const machine = await this.getMachine(id);
    // Attempt connection based on type
    let status: MachineConnectionStatus = 'OFFLINE';
    let firmwareVersion: string | null = null;

    if (machine.connectionType === 'LIGHTBURN_BRIDGE' && machine.ipAddress) {
      try {
        const res = await fetch(`http://${machine.ipAddress}:${machine.port || 8080}/api/status`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          status = 'ONLINE';
          const data = await res.json().catch(() => null);
          firmwareVersion = data?.version || machine.firmwareVersion;
        }
      } catch { status = 'OFFLINE'; }
    } else if (machine.connectionType === 'GRBL' && machine.ipAddress) {
      try {
        const res = await fetch(`http://${machine.ipAddress}:${machine.port || 80}/command?cmd=$I`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          status = 'ONLINE';
          firmwareVersion = (await res.text().catch(() => '')) || machine.firmwareVersion;
        }
      } catch { status = 'OFFLINE'; }
    } else if (machine.connectionType === 'MANUAL') {
      status = 'ONLINE'; // Manual machines are always "online"
    }

    return this.prisma.machine.update({
      where: { id },
      data: { connectionStatus: status, lastPingAt: new Date(), firmwareVersion },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // LASER JOB MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  async listJobs(filters?: {
    userId?: string;
    machineId?: string;
    status?: LaserJobStatus;
    limit?: number;
  }) {
    return this.prisma.laserJob.findMany({
      where: {
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.machineId && { machineId: filters.machineId }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: filters?.limit || 50,
      include: { machine: { select: { name: true, machineType: true, connectionStatus: true } } },
    });
  }

  async getJob(id: string) {
    const job = await this.prisma.laserJob.findUnique({
      where: { id },
      include: { machine: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async createJob(data: {
    machineId: string;
    userId: string;
    jobName: string;
    productType?: string;
    materialLabel?: string;
    thicknessMm?: number;
    cutSvgUrl?: string;
    engraveSvgUrl?: string;
    scoreSvgUrl?: string;
    combinedSvgUrl?: string;
    speedMmS?: number;
    powerPct?: number;
    passes?: number;
    kerfMm?: number;
    jobWidthMm?: number;
    jobHeightMm?: number;
    estimatedTimeSec?: number;
    sourceArtifactId?: string;
    productionBatchId?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  }) {
    const machine = await this.getMachine(data.machineId);

    // Safety validation
    const warnings: string[] = [];
    if (data.jobWidthMm && machine.bedWidthMm && data.jobWidthMm > machine.bedWidthMm) {
      warnings.push(`Job width ${data.jobWidthMm}mm exceeds bed width ${machine.bedWidthMm}mm`);
    }
    if (data.jobHeightMm && machine.bedHeightMm && data.jobHeightMm > machine.bedHeightMm) {
      warnings.push(`Job height ${data.jobHeightMm}mm exceeds bed height ${machine.bedHeightMm}mm`);
    }
    if (data.powerPct && machine.maxPowerW && data.powerPct > 100) {
      warnings.push(`Power ${data.powerPct}% exceeds maximum`);
    }
    if (data.speedMmS && machine.maxSpeedMmS && data.speedMmS > machine.maxSpeedMmS) {
      warnings.push(`Speed ${data.speedMmS}mm/s exceeds machine max ${machine.maxSpeedMmS}mm/s`);
    }

    // Cost calculation
    const estTimeSec = data.estimatedTimeSec || 0;
    const hourlyRate = machine.hourlyCost ? Number(machine.hourlyCost) : 30;
    const machineCost = (estTimeSec / 3600) * hourlyRate;
    const materialCost = data.thicknessMm ? (data.jobWidthMm || 0) * (data.jobHeightMm || 0) / 1e6 * 15 : 0;

    return this.prisma.laserJob.create({
      data: {
        machineId: data.machineId,
        userId: data.userId,
        jobName: data.jobName,
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
        productionBatchId: data.productionBatchId,
        priority: data.priority as any,
        safetyValidated: warnings.length === 0,
        safetyWarningsJson: warnings.length > 0 ? warnings : undefined,
        materialCost,
        machineCost,
        totalCost: materialCost + machineCost,
      },
      include: { machine: { select: { name: true, machineType: true } } },
    });
  }

  async sendJobToMachine(jobId: string) {
    const job = await this.getJob(jobId);
    if (job.status !== 'DRAFT' && job.status !== 'QUEUED') {
      throw new BadRequestException(`Job cannot be sent in status: ${job.status}`);
    }

    // Validate safety
    if (!job.safetyValidated && job.safetyWarningsJson) {
      throw new BadRequestException('Job has unresolved safety warnings. Override required.');
    }

    // Update status to SENDING
    await this.prisma.laserJob.update({
      where: { id: jobId },
      data: { status: 'SENDING', startedAt: new Date() },
    });

    const machine = job.machine;

    // Route to appropriate sender based on connection type
    try {
      switch (machine.connectionType) {
        case 'LIGHTBURN_BRIDGE':
          await this.sendViaLightBurnBridge(machine, job);
          break;
        case 'GRBL':
          await this.sendViaGrbl(machine, job);
          break;
        case 'RUIDA':
          await this.sendViaRuida(machine, job);
          break;
        case 'GLOWFORGE_CLOUD':
          await this.sendViaGlowforge(machine, job);
          break;
        case 'MANUAL':
        default:
          // Manual — just mark as queued for the operator
          break;
      }

      return this.prisma.laserJob.update({
        where: { id: jobId },
        data: { status: 'QUEUED', currentOperation: 'waiting-for-machine' },
      });
    } catch (err) {
      const retryCount = job.retryCount + 1;
      const newStatus = retryCount >= job.maxRetries ? 'FAILED' : 'DRAFT';
      await this.prisma.laserJob.update({
        where: { id: jobId },
        data: {
          status: newStatus as any,
          retryCount,
          errorMessage: err instanceof Error ? err.message : 'Send failed',
          errorCode: 'SEND_FAILED',
        },
      });
      throw err;
    }
  }

  async updateJobProgress(jobId: string, data: {
    progressPct?: number;
    currentOperation?: string;
    status?: LaserJobStatus;
  }) {
    const updates: any = {};
    if (data.progressPct !== undefined) updates.progressPct = data.progressPct;
    if (data.currentOperation) updates.currentOperation = data.currentOperation;
    if (data.status) {
      updates.status = data.status;
      if (data.status === 'COMPLETED') {
        updates.completedAt = new Date();
        const job = await this.getJob(jobId);
        if (job.startedAt) {
          updates.actualTimeSec = Math.round((Date.now() - job.startedAt.getTime()) / 1000);
        }
        // Update machine last job time
        await this.prisma.machine.update({
          where: { id: job.machineId },
          data: { lastJobAt: new Date(), connectionStatus: 'ONLINE' },
        });
      }
      if (data.status === 'CUTTING' || data.status === 'ENGRAVING') {
        const job = await this.getJob(jobId);
        await this.prisma.machine.update({
          where: { id: job.machineId },
          data: { connectionStatus: 'BUSY' },
        });
      }
    }
    return this.prisma.laserJob.update({ where: { id: jobId }, data: updates });
  }

  async cancelJob(jobId: string) {
    const job = await this.getJob(jobId);
    if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
      throw new BadRequestException('Job already finished');
    }
    return this.prisma.laserJob.update({
      where: { id: jobId },
      data: { status: 'CANCELLED' },
    });
  }

  async getJobStats(userId: string) {
    const [total, completed, failed, queued, inProgress] = await Promise.all([
      this.prisma.laserJob.count({ where: { userId } }),
      this.prisma.laserJob.count({ where: { userId, status: 'COMPLETED' } }),
      this.prisma.laserJob.count({ where: { userId, status: 'FAILED' } }),
      this.prisma.laserJob.count({ where: { userId, status: 'QUEUED' } }),
      this.prisma.laserJob.count({ where: { userId, status: { in: ['CUTTING', 'ENGRAVING', 'SENDING'] } } }),
    ]);
    return { total, completed, failed, queued, inProgress };
  }

  // ═══════════════════════════════════════════════════════════════
  // MACHINE-SPECIFIC SENDERS (Phase 1 stubs — real protocol impl later)
  // ═══════════════════════════════════════════════════════════════

  private async sendViaLightBurnBridge(machine: any, job: any) {
    if (!machine.ipAddress) throw new Error('LightBurn Bridge: No IP address configured');
    const endpoint = `http://${machine.ipAddress}:${machine.port || 8080}/api/job`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: job.jobName,
        svgData: job.combinedSvgUrl || job.cutSvgUrl,
        speed: job.speedMmS,
        power: job.powerPct,
        passes: job.passes,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`LightBurn Bridge returned ${res.status}`);
  }

  private async sendViaGrbl(machine: any, job: any) {
    if (!machine.ipAddress) throw new Error('GRBL: No IP address configured');
    // In production, this would convert SVG to GCode and stream it
    const endpoint = `http://${machine.ipAddress}:${machine.port || 80}/upload`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: `; Job: ${job.jobName}\n; Generated by LaserFilesPro Studio\nG90\nG21\n; SVG-to-GCode conversion pending\nM2\n`,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`GRBL returned ${res.status}`);
  }

  private async sendViaRuida(machine: any, _job: any) {
    if (!machine.ipAddress) throw new Error('Ruida: No IP address configured');
    // Ruida controllers use UDP protocol — full implementation requires RDWorks-compatible binary format
    // Phase 1: prepare the job data; actual send requires native bridge
    throw new Error('Ruida direct send requires LaserFilesPro Bridge app (coming soon). Use LightBurn Bridge or export files.');
  }

  private async sendViaGlowforge(machine: any, _job: any) {
    // Glowforge uses proprietary cloud API — limited public access
    throw new Error('Glowforge cloud print requires Glowforge API access. Use manual file upload to app.glowforge.com.');
  }
}
