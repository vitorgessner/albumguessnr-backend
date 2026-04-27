import * as z from 'zod';

export const formSchema = z.object({
    email: z.email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

const passwordConfirmSchema = formSchema.extend({
    confirm: z.string().min(8, 'This field must be at least 8 characters'),
});

export const registerSchema = passwordConfirmSchema.refine(
    (data) => data.password === data.confirm,
    {
        message: 'Passwords do not match',
        path: ['confirm'],
    }
);

export const forgotPasswordSchema = formSchema.omit({
    password: true,
});

export const changePasswordSchema = passwordConfirmSchema
    .omit({
        email: true,
    })
    .refine((data) => data.password === data.confirm, {
        message: 'Passwords do not match',
        path: ['confirm'],
    });
