/**
 * Declares the allowed character set for short non-cryptographic runtime ids.
 */
const NID_CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Creates a short id for runtime-local entities in vector editor state.
 * @param size Requested character length.
 * @param random Source of pseudo-random values used for deterministic tests.
 */
function createNid(
	size: number = 6,
	random: () => number = Math.random,
): string {
	// Guard invalid sizes so runtime id generation never throws during migration.
	const safeSize = Number.isFinite(size) ? Math.max(0, Math.floor(size)) : 0
	let result = ''
	for (let index = 0; index < safeSize; index += 1) {
		const nextIndex = Math.floor(random() * NID_CHARSET.length)
		result += NID_CHARSET[nextIndex] ?? NID_CHARSET[0]
	}
	return result
}

export {createNid as nid}
export {createNid as default}
