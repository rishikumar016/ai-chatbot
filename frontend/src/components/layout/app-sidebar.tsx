import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useApi } from '@/api'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLayout } from '@/context/layout-provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const navigate = useNavigate()
  const { conversationId } = useParams({ strict: false })
  const { setOpenMobile } = useSidebar()
  const user = useAuthStore((s) => s.user)

  const { useConversations, useDeleteConversation } = useApi()
  const { data: conversations, isLoading } = useConversations()
  const deleteConversation = useDeleteConversation()

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    deleteConversation.mutate(id, {
      onSuccess: () => {
        if (conversationId === id) {
          navigate({ to: '/' })
        }
      },
    })
  }

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader className='px-4 pt-6 pb-2'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='lg'
              tooltip='New Craft'
              onClick={() => navigate({ to: '/' })}
              className='iten-center flex justify-center rounded-full bg-craft-gold font-manrope font-semibold text-white shadow-none hover:bg-craft-gold/90 hover:text-white'
            >
              <Plus className='size-5' />
              <span className='block group-data-[collapsible=icon]:hidden'>
                New Craft
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className='px-2'>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarMenu>
            {isLoading && (
              <li className='px-3 py-2 text-xs text-muted-foreground'>
                Loading...
              </li>
            )}
            {!isLoading && (!conversations || conversations.length === 0) && (
              <li className='px-3 py-2 text-xs text-muted-foreground'>
                No conversations yet
              </li>
            )}
            {conversations?.map((conv) => (
              <SidebarMenuItem key={conv._id}>
                <SidebarMenuButton
                  asChild
                  isActive={conversationId === conv._id}
                  tooltip={conv.title}
                >
                  <Link
                    to='/chat/$conversationId'
                    params={{ conversationId: conv._id }}
                    onClick={() => setOpenMobile(false)}
                    className='group/conv'
                  >
                    <MessageSquare className='size-4 shrink-0' />
                    <span className='truncate'>{conv.title}</span>
                    <button
                      onClick={(e) => handleDelete(e, conv._id)}
                      className='ml-auto hidden shrink-0 rounded-sm p-0.5 text-muted-foreground group-hover/conv:inline-flex hover:text-destructive'
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter className='p-4'>
        <div className='flex items-center gap-3'>
          <Avatar className='h-9 w-9 rounded-full'>
            <AvatarImage
              src='/avatars/shadcn.jpg'
              alt={user?.firstName ?? 'User'}
            />
            <AvatarFallback className='rounded-full text-xs'>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className='grid flex-1 text-start text-sm leading-tight'>
            <span className='truncate font-semibold text-foreground'>
              {user ? `${user.firstName} ${user.lastName}` : 'User'}
            </span>
            <span className='truncate text-xs text-muted-foreground'>
              {user?.email ?? ''}
            </span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
