import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-center text-lg tracking-tight'>
            Create an account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter className='flex flex-col items-center'>
          <p className='text-sm text-muted-foreground'>
            {' '}
            Already have an account?{' '}
            <Link
              to='/sign-in'
              className='underline underline-offset-4 hover:text-primary'
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
