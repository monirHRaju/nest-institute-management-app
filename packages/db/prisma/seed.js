/**
 * Prisma seed script — run with: pnpm --filter @repo/db db:seed
 *
 * Seeds:
 *   - 1 SUPER_ADMIN  (super@edumanage.com / SuperAdmin123!)
 *   - Tenant "Mtech IT Institute" (slug: mtech)
 *     └─ 1 TENANT_ADMIN (admin@mtech.com / Admin123!)
 *   - Tenant "Star Academy" (slug: star)
 *     └─ 1 TENANT_ADMIN (admin@star.com / Admin123!)
 */
import { PrismaClient, Role, TenantStatus, TenantPlan } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient({ log: ['error'] });
const HASH_ROUNDS = 12;
async function hash(password) {
    return bcrypt.hash(password, HASH_ROUNDS);
}
async function main() {
    console.log('🌱 Seeding database...\n');
    // ── 1. Super Admin ──────────────────────────────────────────────────────────
    const superAdmin = await prisma.user.upsert({
        where: {
            // SUPER_ADMIN has tenantId = null; email is unique globally for null-tenant users.
            // Prisma upsert on @@unique([email, tenantId]) with tenantId=null requires a raw find+create.
            // We use findFirst + create/update pattern instead.
            email_tenantId: {
                email: 'super@edumanage.com',
                tenantId: '', // workaround: actual upsert below
            },
        },
        update: {},
        create: {
            email: 'super@edumanage.com',
            passwordHash: await hash('SuperAdmin123!'),
            firstName: 'Super',
            lastName: 'Admin',
            role: Role.SUPER_ADMIN,
            tenantId: null,
        },
    }).catch(async () => {
        // Handle null tenantId upsert manually
        const existing = await prisma.user.findFirst({
            where: { email: 'super@edumanage.com', tenantId: null },
        });
        if (existing) {
            console.log('  ✓ Super Admin already exists, skipping.');
            return existing;
        }
        return prisma.user.create({
            data: {
                email: 'super@edumanage.com',
                passwordHash: await hash('SuperAdmin123!'),
                firstName: 'Super',
                lastName: 'Admin',
                role: Role.SUPER_ADMIN,
                tenantId: null,
            },
        });
    });
    console.log(`  ✅ Super Admin: ${superAdmin.email}`);
    // ── 2. Tenant: Mtech IT Institute ───────────────────────────────────────────
    const mtechTheme = {
        primaryColor: '#2563eb',
        accentColor: '#f59e0b',
        aboutText: 'Mtech IT Institute is a leading computer training center offering professional courses in web development, graphic design, and networking.',
        contactPhone: '01700000001',
        contactEmail: 'info@mtech.edu.bd',
        address: 'Dhaka, Bangladesh',
    };
    const mtech = await prisma.tenant.upsert({
        where: { slug: 'mtech' },
        update: { themeConfig: mtechTheme },
        create: {
            name: 'Mtech IT Institute',
            slug: 'mtech',
            status: TenantStatus.ACTIVE,
            plan: TenantPlan.FREE,
            themeConfig: mtechTheme,
        },
    });
    console.log(`  ✅ Tenant: ${mtech.name} (slug: ${mtech.slug})`);
    // Mtech TENANT_ADMIN
    const mtechAdmin = await prisma.user.findFirst({
        where: { email: 'admin@mtech.com', tenantId: mtech.id },
    });
    if (!mtechAdmin) {
        await prisma.user.create({
            data: {
                email: 'admin@mtech.com',
                passwordHash: await hash('Admin123!'),
                firstName: 'Mtech',
                lastName: 'Admin',
                role: Role.TENANT_ADMIN,
                tenantId: mtech.id,
            },
        });
        console.log('  ✅ Tenant Admin: admin@mtech.com');
    }
    else {
        console.log('  ✓ Tenant Admin admin@mtech.com already exists, skipping.');
    }
    // ── 3. Tenant: Star Academy ─────────────────────────────────────────────────
    const starTheme = {
        primaryColor: '#16a34a',
        accentColor: '#dc2626',
        aboutText: 'Star Academy provides quality education and coaching for students preparing for competitive exams and professional certifications.',
        contactPhone: '01700000002',
        contactEmail: 'info@star.edu.bd',
        address: 'Chittagong, Bangladesh',
    };
    const star = await prisma.tenant.upsert({
        where: { slug: 'star' },
        update: { themeConfig: starTheme },
        create: {
            name: 'Star Academy',
            slug: 'star',
            status: TenantStatus.ACTIVE,
            plan: TenantPlan.FREE,
            themeConfig: starTheme,
        },
    });
    console.log(`  ✅ Tenant: ${star.name} (slug: ${star.slug})`);
    // Star TENANT_ADMIN
    const starAdmin = await prisma.user.findFirst({
        where: { email: 'admin@star.com', tenantId: star.id },
    });
    if (!starAdmin) {
        await prisma.user.create({
            data: {
                email: 'admin@star.com',
                passwordHash: await hash('Admin123!'),
                firstName: 'Star',
                lastName: 'Admin',
                role: Role.TENANT_ADMIN,
                tenantId: star.id,
            },
        });
        console.log('  ✅ Tenant Admin: admin@star.com');
    }
    else {
        console.log('  ✓ Tenant Admin admin@star.com already exists, skipping.');
    }
    console.log('\n🎉 Seed complete!\n');
    console.log('  Credentials:');
    console.log('  ┌─────────────────────────────────────────────────────────┐');
    console.log('  │ Super Admin   super@edumanage.com  / SuperAdmin123!     │');
    console.log('  │ Mtech Admin   admin@mtech.com      / Admin123!          │');
    console.log('  │ Star Admin    admin@star.com        / Admin123!          │');
    console.log('  └─────────────────────────────────────────────────────────┘');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map