import { REGEX_MARKER } from '@/util/constants';

const PARSER_PRESETS = {
    // Counting starts at 0
    epacts: { marker_col: 3, pvalue_col: 8, is_log_p: false }, // https://genome.sph.umich.edu/wiki/EPACTS#Output_Text_of_All_Test_Statistics
    plink: { marker_col: 1, pvalue_col: 8, is_log_p: false }, // https://www.cog-genomics.org/plink2/formats
    // TODO: Documentation source for rvtests?
    rvtests: { chr_col: 0, pos_col: 1, ref_col: 2, alt_col: 3, pvalue_col: 15, is_log_p: false },
    // FIXME: Canadian Sarah suggests that SAIGE columns depend on which options were chosen
    saige: { marker_col: 2, pvalue_col: 11, is_log_p: false }, // https://github.com/weizhouUMICH/SAIGE/wiki/SAIGE-Hands-On-Practical
    // FIXME: What is correct pvalue col- 11 or 12?
    'bolt-lmm': { chr_col: 1, pos_col: 2, ref_col: 5, alt_col: 4, pvalue_col: 10, is_log_p: false }, // https://data.broadinstitute.org/alkesgroup/BOLT-LMM/#x1-450008.1
};

/**
 * Specify how to parse a GWAS file, given certain column information.
 * Outputs an object with fields in portal API format.
 * @param [marker_col]
 * @param [chr_col]
 * @param [pos_col]
 * @param [ref_col]
 * @param [alt_col]
 * @param pvalue_col
 * @param [is_log_p=false]
 * @param [delimiter='\t']
 * @return {function(*): {chromosome: *, position: number, ref_allele: *,
 *          log_pvalue: number, variant: string}}
 */
function makeParser({ marker_col, chr_col, pos_col, ref_col, alt_col, pvalue_col, is_log_p = false, delimiter = '\t' } = {}) {
    // Column IDs should be 0-indexed (computer friendly)
    if (marker_col !== undefined && chr_col !== undefined && pos_col !== undefined) {
        throw new Error('Must specify either marker OR chr + pos');
    }
    if (!(marker_col !== undefined || (chr_col !== undefined && pos_col !== undefined))) {
        throw new Error('Must specify how to locate marker');
    }

    return (line) => {
        const fields = line.split(delimiter);
        let chr;
        let pos;
        let ref;
        let alt;
        if (marker_col !== undefined) {
            const marker = fields[marker_col];
            const match = marker.match(REGEX_MARKER);
            if (!match) {
                // eslint-disable-next-line no-throw-literal
                throw new Error('Could not understand marker format. Must be of format chr:pos or chr:pos_ref/alt');
            }
            [chr, pos, ref, alt] = match.slice(1);
        } else if (chr_col !== undefined && pos_col !== undefined) {
            chr = fields[chr_col].replace(/^chr/g, '');
            pos = fields[pos_col];
            ref = fields[ref_col];
            alt = fields[alt_col];
        } else {
            throw new Error('Must specify how to parse file');
        }

        const pvalue_raw = +fields[pvalue_col];
        const log_pval = is_log_p ? pvalue_raw : -Math.log10(pvalue_raw);
        ref = ref || null;
        alt = alt || null;
        const ref_alt = (ref && alt) ? `_${ref}/${alt}` : '';
        return {
            chromosome: chr,
            position: +pos,
            ref_allele: ref,
            alt_allele: alt,
            log_pvalue: log_pval,
            variant: `${chr}:${pos}${ref_alt}`,
        };
    };
}

export { makeParser, PARSER_PRESETS };
