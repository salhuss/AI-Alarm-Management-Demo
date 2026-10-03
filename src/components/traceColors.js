/**
 * Trace colours, shared by the trend graph and the faceplates so a plate
 * and its line on the trend are visibly the same series.
 *
 * Order matters: a series' colour is its index in the trend's series list,
 * and the unit page assigns faceplate colours from the same ordering.
 */
export const TRACE_COLORS = ['#4a9a4a', '#c89000', '#3a8fd0', '#9a7ac0', '#c05a5a']

export const traceColorFor = (index) => TRACE_COLORS[index % TRACE_COLORS.length]
