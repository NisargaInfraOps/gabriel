void printout(int *p) {
	int i,j=0;
	printf("\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nuse R to reset\n");
	printf("use Q to exit\n\n");
	printf("-------------------------\n\n");
	for(i=0; i<16; i++) {
		if(*(p+i)!=0)
			printf("%5d",*(p+i));
		else
			printf("     ");
		if(++j==4) {
			printf("\n\n");
			j=0;
		}
	}
	printf("-------------------------\n\n");
}
