'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { CreateDiscussionDialog } from '@/components/create-discussion-dialog';
import { Plus } from 'lucide-react';

const CreateDiscussionLauncher: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        Create Discussion
      </Button>
      <CreateDiscussionDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default CreateDiscussionLauncher;
