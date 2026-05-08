/**
 * Curative Biotechnology Tools Tests
 *
 * Tests for CAR-T, mRNA vaccines, CRISPR, and oncolytic virus matching
 */

import { describe, test, expect } from '@jest/globals';
import {
  ApprovedCARTProducts,
  KeymRNAVaccinePrograms,
  KeyCRISPRPrograms,
  KeyOncolyticVirusPrograms,
} from '../../src/domain/biotech/index.js';

describe('Curative Biotechnology Domain Models', () => {
  describe('CAR-T Products', () => {
    test('has all FDA-approved CAR-T products', () => {
      expect(ApprovedCARTProducts.length).toBeGreaterThanOrEqual(6);
    });

    test('Kymriah is included with correct data', () => {
      const kymriah = ApprovedCARTProducts.find(p => p.tradeName === 'Kymriah');
      expect(kymriah).toBeDefined();
      expect(kymriah?.targetAntigen).toBe('CD19');
      expect(kymriah?.manufacturer).toBe('Novartis');
      expect(kymriah?.completeResponseRate).toBe(63);
    });

    test('Breyanzi has highest CR rate', () => {
      const breyanzi = ApprovedCARTProducts.find(p => p.tradeName === 'Breyanzi');
      expect(breyanzi).toBeDefined();
      expect(breyanzi?.completeResponseRate).toBe(94);
    });

    test('BCMA-targeting products exist for Multiple Myeloma', () => {
      const bcmaProducts = ApprovedCARTProducts.filter(p => p.targetAntigen === 'BCMA');
      expect(bcmaProducts.length).toBeGreaterThanOrEqual(2);

      bcmaProducts.forEach(product => {
        expect(product.approvedIndications.some(ind =>
          ind.cancerType.includes('Multiple Myeloma')
        )).toBe(true);
      });
    });

    test('all products have required fields', () => {
      ApprovedCARTProducts.forEach(product => {
        expect(product.id).toBeDefined();
        expect(product.name).toBeDefined();
        expect(product.tradeName).toBeDefined();
        expect(product.manufacturer).toBeDefined();
        expect(product.targetAntigen).toBeDefined();
        expect(product.cellSource).toBe('autologous');
        expect(product.approvedIndications.length).toBeGreaterThan(0);
      });
    });
  });

  describe('mRNA Vaccine Programs', () => {
    test('has key mRNA vaccine programs', () => {
      expect(KeymRNAVaccinePrograms.length).toBeGreaterThanOrEqual(2);
    });

    test('mRNA-4157 (Moderna/Merck) is included', () => {
      const mrna4157 = KeymRNAVaccinePrograms.find(p => p.id === 'mrna-4157');
      expect(mrna4157).toBeDefined();
      expect(mrna4157?.developer).toBe('Moderna/Merck');
      expect(mrna4157?.type).toBe('personalized_neoantigen');
      expect(mrna4157?.cancerTypes).toContain('Melanoma');
    });

    test('all programs have clinical trial IDs', () => {
      KeymRNAVaccinePrograms.forEach(program => {
        expect(program.clinicalTrialId).toBeDefined();
        expect(program.clinicalTrialId).toMatch(/^NCT\d+$/);
      });
    });
  });

  describe('CRISPR Programs', () => {
    test('has key CRISPR programs', () => {
      expect(KeyCRISPRPrograms.length).toBeGreaterThanOrEqual(3);
    });

    test('programs use different editing systems', () => {
      const systems = new Set(KeyCRISPRPrograms.map(p => p.editingSystem));
      expect(systems.size).toBeGreaterThanOrEqual(2);
    });

    test('CB-010 has high response rate', () => {
      const cb010 = KeyCRISPRPrograms.find(p => p.id === 'cb-010');
      expect(cb010).toBeDefined();
      expect(cb010?.completeResponseRate).toBe(69);
    });
  });

  describe('Oncolytic Virus Programs', () => {
    test('has FDA-approved oncolytic virus', () => {
      const approved = KeyOncolyticVirusPrograms.filter(p => p.phase === 'approved');
      expect(approved.length).toBeGreaterThanOrEqual(1);
    });

    test('T-VEC (Imlygic) is included', () => {
      const tvec = KeyOncolyticVirusPrograms.find(p => p.tradeName === 'Imlygic');
      expect(tvec).toBeDefined();
      expect(tvec?.virusType).toBe('HSV-1');
      expect(tvec?.cancerTypes).toContain('Melanoma');
    });
  });
});

describe('Patient Matching Logic', () => {
  test('DLBCL patient matches CD19 CAR-T products', () => {
    const cd19Products = ApprovedCARTProducts.filter(p =>
      p.targetAntigen === 'CD19' &&
      p.approvedIndications.some(ind =>
        ind.cancerType.toLowerCase().includes('dlbcl')
      )
    );

    expect(cd19Products.length).toBeGreaterThanOrEqual(3);
  });

  test('Multiple Myeloma patient matches BCMA products', () => {
    const bcmaProducts = ApprovedCARTProducts.filter(p =>
      p.targetAntigen === 'BCMA' &&
      p.approvedIndications.some(ind =>
        ind.cancerType.toLowerCase().includes('myeloma')
      )
    );

    expect(bcmaProducts.length).toBeGreaterThanOrEqual(2);
  });

  test('Melanoma patient has multiple options', () => {
    // Check oncolytic virus
    const ovMelanoma = KeyOncolyticVirusPrograms.filter(p =>
      p.cancerTypes.some(ct => ct.toLowerCase().includes('melanoma'))
    );
    expect(ovMelanoma.length).toBeGreaterThanOrEqual(1);

    // Check mRNA vaccines
    const mrnaMelanoma = KeymRNAVaccinePrograms.filter(p =>
      p.cancerTypes.some(ct => ct.toLowerCase().includes('melanoma'))
    );
    expect(mrnaMelanoma.length).toBeGreaterThanOrEqual(1);
  });
});
