import { useState, useEffect } from 'react';
import { api, type DriveInfo } from '~/lib/api';
import { formatBytes } from '~/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { HardDrive, Folder, ChevronRight, CornerDownRight } from 'lucide-react';

interface DrivePickerProps {
  onSelect: (path: string) => void;
}

export function DrivePicker({ onSelect }: DrivePickerProps) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDrives()
      .then(setDrives)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p>Loading drives...</p>
        ) : drives.map(drive => {
          const usagePercent = drive.total_bytes ? (drive.used_bytes / drive.total_bytes) * 100 : 0;
          return (
            <Card key={drive.letter} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="h-5 w-5 text-primary" />
                    <span>{drive.label || 'Local Disk'} ({drive.letter})</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Free: {formatBytes(drive.free_bytes)}</span>
                    <span className="text-muted-foreground">Total: {formatBytes(drive.total_bytes)}</span>
                  </div>
                  <Progress value={usagePercent} className="h-2" />
                  <div className="flex space-x-2 pt-2">
                    <Button onClick={() => onSelect(drive.letter)} className="flex-1">
                      Scan Drive
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex justify-center">
        <FolderBrowserDialog onSelect={onSelect} />
      </div>
    </div>
  );
}

function FolderBrowserDialog({ onSelect }: { onSelect: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState<{name: string, path: string, has_children: boolean}[]>([]);

  useEffect(() => {
    if (open) {
      api.browsePath(currentPath).then(setItems).catch(console.error);
    }
  }, [open, currentPath]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full max-w-sm">
          <Folder className="mr-2 h-4 w-4" />
          Browse Folder...
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Folder to Scan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2 text-sm bg-muted p-2 rounded-md font-mono">
            <span>{currentPath || 'Computer'}</span>
          </div>
          <ScrollArea className="h-72 border rounded-md p-2">
            {currentPath && (
              <Button 
                variant="ghost" 
                className="w-full justify-start h-8 px-2"
                onClick={() => {
                  const parts = currentPath.split('\\');
                  parts.pop();
                  if (parts.length === 1 && parts[0].endsWith(':')) {
                    setCurrentPath(parts[0] + '\\');
                  } else {
                    setCurrentPath(parts.join('\\'));
                  }
                }}
              >
                <CornerDownRight className="mr-2 h-4 w-4 rotate-180" />
                ..
              </Button>
            )}
            {items.map(item => (
              <div key={item.path} className="flex items-center w-full">
                <Button
                  variant="ghost"
                  className="flex-1 justify-start h-8 px-2 font-normal"
                  onClick={() => onSelect(item.path)}
                >
                  <Folder className="mr-2 h-4 w-4 text-blue-400" />
                  {item.name}
                </Button>
                {item.has_children && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 ml-1"
                    onClick={() => setCurrentPath(item.path)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
