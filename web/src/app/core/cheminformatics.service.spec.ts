import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CheminformaticsService } from './cheminformatics.service';

// Consumer side of the Python→web cheminformatics contract: forTarget loads the precomputed
// JSON into a Map<chembl_id, ChemInfo> the Explorer reads, and degrades to null when a target
// isn't precomputed. (Producer + shape are covered by cicd/check_cheminformatics_contract.cjs.)
describe('CheminformaticsService', () => {
  let svc: CheminformaticsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CheminformaticsService, provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(CheminformaticsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('slug() upper-cases and collapses non-alphanumerics (matches the Python producer)', () => {
    expect(CheminformaticsService.slug('KRAS G12C')).toBe('KRAS_G12C');
    expect(CheminformaticsService.slug('egfr')).toBe('EGFR');
  });

  it('forTarget parses byChembl into a Map<ChemInfo> and records the cluster count', async () => {
    const p = svc.forTarget('EGFR');
    http.expectOne('data/cheminformatics/EGFR.json').flush({
      clusterCount: 3,
      byChembl: {
        CHEMBL1: {
          painsAlerts: 0, pains: [], brenkAlerts: 1, brenk: ['alert'], scaffold: 'c1ccccc1',
          eganOk: true, fractionCsp3: 0.3, clean: true, le: 0.5, lle: 4.1, cluster: 0,
        },
      },
    });
    const m = await p;
    expect(m?.size).toBe(1);
    expect(m?.get('CHEMBL1')?.brenkAlerts).toBe(1);
    expect(svc.clusterCount('EGFR')).toBe(3);
  });

  it('forTarget returns null when the target is not precomputed (404)', async () => {
    const p = svc.forTarget('NOSUCHTARGET');
    http.expectOne('data/cheminformatics/NOSUCHTARGET.json')
      .flush('', { status: 404, statusText: 'Not Found' });
    expect(await p).toBeNull();
  });
});
