import { Database, memberships } from '@studiohouse/db';
import { MembershipRole, roleAtLeast } from '@studiohouse/models';
import { and, eq } from 'drizzle-orm';
import { VerifiedUser } from './verify-token';

export class ForbiddenError extends Error {
  readonly status = 403;
}

export class NotFoundError extends Error {
  readonly status = 404;
}

/**
 * Resolves the caller's role in a studio and enforces a minimum. A user with
 * no membership gets 404 rather than 403, so studio ids are not enumerable.
 */
export async function requireRole(
  db: Database,
  user: VerifiedUser,
  studioId: string,
  required: MembershipRole,
): Promise<MembershipRole> {
  const [row] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(eq(memberships.studioId, studioId), eq(memberships.userId, user.id)),
    );
  if (!row) throw new NotFoundError('Studio not found');
  if (!roleAtLeast(row.role, required)) {
    throw new ForbiddenError(`Requires ${required} role`);
  }
  return row.role;
}
